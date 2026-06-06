import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os

# Load the data
df = pd.read_csv(r"c:\Users\windows-11\Desktop\agrishield-ap\public\data\crop_yield_ap.csv")

# Set the output directory
out_dir = r"C:\Users\windows-11\.gemini\antigravity\brain\0ab22fac-4605-4ea3-995b-87bac66e7ef9\artifacts"
os.makedirs(out_dir, exist_ok=True)

# 1. Top 10 Crops by Total Production
top_crops = df.groupby('Crop')['Production'].sum().sort_values(ascending=False).head(10)
plt.figure(figsize=(10, 6))
sns.barplot(x=top_crops.values, y=top_crops.index, palette="viridis")
plt.title('Top 10 Crops by Total Production in Andhra Pradesh')
plt.xlabel('Total Production')
plt.ylabel('Crop')
plt.tight_layout()
plt.savefig(os.path.join(out_dir, "top_crops_production.png"))
plt.close()

# 2. Total Production Over the Years
prod_year = df.groupby('Crop_Year')['Production'].sum()
plt.figure(figsize=(10, 6))
sns.lineplot(x=prod_year.index, y=prod_year.values, marker='o')
plt.title('Total Crop Production Over the Years in AP')
plt.xlabel('Year')
plt.ylabel('Total Production')
plt.grid(True)
plt.tight_layout()
plt.savefig(os.path.join(out_dir, "production_over_years.png"))
plt.close()

# 3. Area vs Production
plt.figure(figsize=(10, 6))
sns.scatterplot(data=df, x='Area', y='Production', alpha=0.6)
plt.title('Area vs Production for Crops in AP')
plt.xlabel('Area')
plt.ylabel('Production')
plt.xscale('log')
plt.yscale('log')
plt.tight_layout()
plt.savefig(os.path.join(out_dir, "area_vs_production.png"))
plt.close()
