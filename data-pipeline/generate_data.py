import pandas as pd
import random
from faker import Faker
from datetime import datetime, timedelta

fake = Faker()
tickers = ['AAPL', 'TSLA', 'MSFT', 'ION', 'ZS']

# 1. Generate 1,000 perfect internal trades
internal_data = []
for _ in range(1000):
    internal_data.append({
        'trade_id': fake.uuid4()[:8],
        'ticker': random.choice(tickers),
        'trade_type': random.choice(['BUY', 'SELL']),
        'volume': random.randint(10, 500),
        'price': round(random.uniform(50.0, 500.0), 2),
        'execution_time': fake.date_time_between(start_date='-1d', end_date='now')
    })

# 2. Copy the data for the broker, but introduce "messiness"
broker_data = []
for row in internal_data:
    new_row = row.copy()
    new_row['broker_trade_id'] = new_row.pop('trade_id') # Rename ID column
    
    chance = random.random()
    if chance < 0.05: # 5% chance of a price typo
        new_row['price'] = round(new_row['price'] + random.uniform(-2.0, 2.0), 2)
    elif chance < 0.10: # 5% chance the broker completely missed the trade
        continue 
        
    broker_data.append(new_row)

# 3. Export to CSV
pd.DataFrame(internal_data).to_csv('internal_trades.csv', index=False)
pd.DataFrame(broker_data).to_csv('broker_trades.csv', index=False)
print("Data generated! Check your folder for the CSV files.")