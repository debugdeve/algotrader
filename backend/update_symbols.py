import requests

def download_nifty500():
    print("Initiating connection to the National Stock Exchange...")
    
    # The official NSE link for the NIFTY 500
    url = "https://archives.nseindia.com/content/indices/ind_nifty500list.csv"
    
    # NSE security requires us to pretend we are a normal web browser, not a bot!
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        # Go fetch the data
        response = requests.get(url, headers=headers, timeout=10)
        
        # Check if they let us in (Code 200 means OK)
        if response.status_code == 200:
            file_path = "nifty500.csv"
            
            # Save the file to our folder
            with open(file_path, 'wb') as file:
                file.write(response.content)
                
            print(f"✅ Success! The latest NIFTY 500 list has been saved as '{file_path}'.")
        else:
            print(f"❌ Failed to download. The server blocked us with code: {response.status_code}")
            
    except Exception as e:
        print(f"❌ An error occurred: {e}")

if __name__ == "__main__":
    download_nifty500()