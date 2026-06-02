from __future__ import annotations

import argparse
import json
import random
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

import torch
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from transformers import AutoImageProcessor, AutoModelForImageClassification


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


@dataclass(frozen=True)
class ImageRecord:
    path: Path
    label_name: str
    label_id: int


class DiseaseImageDataset(Dataset):
    def __init__(self, records: list[ImageRecord], processor: AutoImageProcessor) -> None:
        self.records = records
        self.processor = processor

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, index: int) -> dict[str, object]:
        record = self.records[index]
        with Image.open(record.path) as image:
            image = image.convert("RGB")
        return {
            "image": image,
            "label": record.label_id,
            "label_name": record.label_name,
            "path": str(record.path),
        }


def _discover_images(data_dir: Path, label_depth: int) -> list[tuple[Path, str]]:
    images: list[tuple[Path, str]] = []
    for path in sorted(data_dir.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue

        relative_parts = path.relative_to(data_dir).parts[:-1]
        if not relative_parts:
            continue

        chosen_parts = relative_parts if label_depth <= 0 else relative_parts[-label_depth:]
        label_name = "___".join(chosen_parts)
        images.append((path, label_name))

    return images


def _split_records(
    items: list[tuple[Path, str]],
    seed: int,
    val_ratio: float,
) -> tuple[list[tuple[Path, str]], list[tuple[Path, str]]]:
    by_label: dict[str, list[Path]] = defaultdict(list)
    for path, label_name in items:
        by_label[label_name].append(path)

    rng = random.Random(seed)
    train_items: list[tuple[Path, str]] = []
    val_items: list[tuple[Path, str]] = []

    for label_name, paths in by_label.items():
        shuffled = paths[:]
        rng.shuffle(shuffled)
        if len(shuffled) == 1:
            train_items.append((shuffled[0], label_name))
            continue

        val_count = max(1, int(round(len(shuffled) * val_ratio)))
        val_count = min(val_count, len(shuffled) - 1)
        val_paths = shuffled[:val_count]
        train_paths = shuffled[val_count:]

        train_items.extend((path, label_name) for path in train_paths)
        val_items.extend((path, label_name) for path in val_paths)

    rng.shuffle(train_items)
    rng.shuffle(val_items)
    return train_items, val_items


def _build_records(items: list[tuple[Path, str]], label_to_id: dict[str, int]) -> list[ImageRecord]:
    return [
        ImageRecord(path=path, label_name=label_name, label_id=label_to_id[label_name])
        for path, label_name in items
    ]


def _make_collate_fn(processor: AutoImageProcessor):
    def collate(batch: list[dict[str, object]]) -> dict[str, torch.Tensor]:
        images = [item["image"] for item in batch]
        labels = torch.tensor([int(item["label"]) for item in batch], dtype=torch.long)
        encoded = processor(images=images, return_tensors="pt")
        encoded["labels"] = labels
        return encoded

    return collate


def _evaluate(model, dataloader: DataLoader, device: torch.device) -> tuple[float, float]:
    model.eval()
    total = 0
    correct = 0
    total_loss = 0.0

    with torch.no_grad():
        for batch in dataloader:
            labels = batch["labels"].to(device)
            pixel_values = batch["pixel_values"].to(device)
            outputs = model(pixel_values=pixel_values, labels=labels)
            logits = outputs.logits
            predictions = logits.argmax(dim=-1)
            total += labels.size(0)
            correct += (predictions == labels).sum().item()
            total_loss += float(outputs.loss.item()) * labels.size(0)

    if total == 0:
        return 0.0, 0.0
    return correct / total, total_loss / total


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fine-tune a Hugging Face plant disease classifier on a local image folder."
    )
    parser.add_argument("--data-dir", type=Path, required=True, help="Root folder containing disease images.")
    parser.add_argument(
        "--base-model",
        default="Arko007/nfnet-f1-plant-disease",
        help="Base Hugging Face image classification model.",
    )
    parser.add_argument("--output-dir", type=Path, required=True, help="Where to save the fine-tuned model.")
    parser.add_argument("--label-depth", type=int, default=2, help="How many folder levels make one class name.")
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--learning-rate", type=float, default=5e-5)
    parser.add_argument("--weight-decay", type=float, default=0.01)
    parser.add_argument("--val-ratio", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--max-train-samples", type=int, default=0, help="Optional cap per class for quick experiments.")
    args = parser.parse_args()

    if not args.data_dir.exists():
        raise SystemExit(f"Data directory does not exist: {args.data_dir}")

    items = _discover_images(args.data_dir, args.label_depth)
    if not items:
        raise SystemExit(f"No images found under {args.data_dir}")

    train_items, val_items = _split_records(items, args.seed, args.val_ratio)
    if not train_items or not val_items:
        raise SystemExit("Need at least one training sample and one validation sample.")

    label_names = sorted({label_name for _, label_name in items})
    label_to_id = {label_name: index for index, label_name in enumerate(label_names)}
    id2label = {index: label_name for label_name, index in label_to_id.items()}

    if args.max_train_samples > 0:
        sampled: list[tuple[Path, str]] = []
        by_label: dict[str, list[tuple[Path, str]]] = defaultdict(list)
        for path, label_name in train_items:
            by_label[label_name].append((path, label_name))

        rng = random.Random(args.seed)
        for label_name in sorted(by_label.keys()):
            label_records = by_label[label_name]
            rng.shuffle(label_records)
            sampled.extend(label_records[: args.max_train_samples])
        train_items = sampled

    processor = AutoImageProcessor.from_pretrained(args.base_model)
    model = AutoModelForImageClassification.from_pretrained(
        args.base_model,
        num_labels=len(label_names),
        label2id=label_to_id,
        id2label=id2label,
        ignore_mismatched_sizes=True,
    )

    train_records = _build_records(train_items, label_to_id)
    val_records = _build_records(val_items, label_to_id)

    train_loader = DataLoader(
        DiseaseImageDataset(train_records, processor),
        batch_size=args.batch_size,
        shuffle=True,
        collate_fn=_make_collate_fn(processor),
    )
    val_loader = DataLoader(
        DiseaseImageDataset(val_records, processor),
        batch_size=args.batch_size,
        shuffle=False,
        collate_fn=_make_collate_fn(processor),
    )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate, weight_decay=args.weight_decay)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=max(len(train_loader) * args.epochs, 1)
    )

    best_accuracy = -1.0
    best_state: dict[str, torch.Tensor] | None = None

    for epoch in range(1, args.epochs + 1):
        model.train()
        running_loss = 0.0
        running_correct = 0
        running_total = 0

        for batch in train_loader:
            labels = batch["labels"].to(device)
            pixel_values = batch["pixel_values"].to(device)

            optimizer.zero_grad(set_to_none=True)
            outputs = model(pixel_values=pixel_values, labels=labels)
            loss = outputs.loss
            loss.backward()
            optimizer.step()
            scheduler.step()

            logits = outputs.logits
            predictions = logits.argmax(dim=-1)
            running_loss += float(loss.item()) * labels.size(0)
            running_correct += (predictions == labels).sum().item()
            running_total += labels.size(0)

        train_accuracy = running_correct / max(running_total, 1)
        train_loss = running_loss / max(running_total, 1)
        val_accuracy, val_loss = _evaluate(model, val_loader, device)

        print(
            f"epoch {epoch}/{args.epochs} | "
            f"train loss {train_loss:.4f} acc {train_accuracy:.4f} | "
            f"val loss {val_loss:.4f} acc {val_accuracy:.4f}"
        )

        if val_accuracy >= best_accuracy:
            best_accuracy = val_accuracy
            best_state = {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}

    if best_state is not None:
        model.load_state_dict(best_state)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(args.output_dir)
    processor.save_pretrained(args.output_dir)

    metadata = {
        "base_model": args.base_model,
        "label_depth": args.label_depth,
        "labels": label_names,
        "best_val_accuracy": round(best_accuracy, 4),
        "train_samples": len(train_records),
        "val_samples": len(val_records),
    }
    (args.output_dir / "disease-training-metadata.json").write_text(
        json.dumps(metadata, indent=2),
        encoding="utf-8",
    )

    print(f"saved fine-tuned model to {args.output_dir}")
    print(f"best validation accuracy: {best_accuracy:.4f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
