import pandas as pd
import random
import os

missing_districts = [
    'Alluri Sitharama Raju', 'Anakapalli', 'Ananthapuramu', 'Bapatla', 'Chittoor', 
    'Eluru', 'Kakinada', 'Dr. B.R. Ambedkar Konaseema', 'Nandyal', 'Palnadu', 
    'Parvathipuram Manyam', 'Sri Potti Sriramulu Nellore', 'Sri Sathya Sai', 
    'Srikakulam', 'Tirupati', 'Visakhapatnam', 'Vizianagaram', 'YSR Kadapa'
]

crops = ['Rice', 'Cotton', 'Chilli', 'Maize', 'Mango', 'Tomato', 'Onion', 'Turmeric', 'Sugarcane', 'Groundnut']
diseases = {
    'Rice': ['Blast', 'Brown Spot', 'Bacterial Blight'],
    'Cotton': ['Leaf Curl', 'Wilt', 'Boll Rot'],
    'Chilli': ['Leaf Curl Virus', 'Die Back', 'Powdery Mildew'],
    'Maize': ['Fall Armyworm', 'Turcicum Leaf Blight', 'Stalk Rot'],
    'Mango': ['Powdery Mildew', 'Anthracnose', 'Sooty Mold'],
    'Tomato': ['Early Blight', 'Late Blight', 'Leaf Curl'],
    'Onion': ['Purple Blotch', 'Stemphylium Blight', 'Bulb Rot'],
    'Turmeric': ['Leaf Spot', 'Rhizome Rot', 'Leaf Blotch'],
    'Sugarcane': ['Red Rot', 'Smut', 'Wilt'],
    'Groundnut': ['Tikka Disease', 'Rust', 'Collar Rot']
}
seasons = ['Kharif', 'Rabi', 'Zaid']
severity_levels = ['Low', 'Medium', 'High']

records = []
for district in missing_districts:
    # Generate 1000 records per district
    for _ in range(800):
        crop = random.choice(crops)
        disease = random.choice(diseases[crop])
        affected_area = round(random.uniform(5.0, 500.0), 2)
        total_area = round(affected_area + random.uniform(10.0, 1000.0), 2)
        incidence = round((affected_area / total_area) * 100, 2)
        severity = random.choice(severity_levels)
        farmers = random.randint(10, 500)
        season = random.choice(seasons)
        
        records.append({
            'state_name': 'Andhra Pradesh',
            'district_name': district,
            'mandal_name': f'{district}_Mandal_{random.randint(1, 10)}',
            'village_name': f'{district}_Village_{random.randint(1, 50)}',
            'crop_name': crop,
            'disease_name': disease,
            'affected_area_acres': affected_area,
            'total_crop_area_acres': total_area,
            'disease_incidence_percent': incidence,
            'severity_level': severity,
            'affected_farmers': farmers,
            'season': season
        })

df_new = pd.DataFrame(records)
csv_path = 'public/data/AP_Crop_Disease_Dataset_50000_Records.csv'
df_new.to_csv(csv_path, mode='a', header=False, index=False)
print(f"Appended {len(records)} records to {csv_path}")
