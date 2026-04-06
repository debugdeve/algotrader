import pandas as pd
import json
import urllib.request
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

url = 'https://archives.nseindia.com/content/indices/ind_nifty500list.csv'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    df = pd.read_csv(urllib.request.urlopen(req))
    symbols = df['Symbol'].tolist()
    names = df['Company Name'].tolist()
    sectors = df['Industry'].tolist()
    
    js_content = "export const NIFTY_500 = [\n"
    for s, n, sec in zip(symbols, names, sectors):
        # escape names safely
        safe_name = str(n).replace("'", "\\'")
        js_content += f"  {{ symbol: '{s}', name: '{safe_name}', sector: '{sec}' }},\n"
    js_content += "];\n"
    
    with open('../src/data/nseUniverse.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
    print('SUCCESS')
except Exception as e:
    print('FAILED:', e)
