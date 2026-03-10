# SOLR Configuration

## Connection Details

- **URL**: https://solr.peviitor.ro
- **Credentials**: Set in GitHub Secrets as `SOLR_USER` and `SOLR_PASSWD`

## Usage

When connecting to SOLR:
1. Read credentials from GitHub Secrets: `SOLR_USER` and `SOLR_PASSWD`
2. Use basic authentication with these credentials
3. The base URL is `https://solr.peviitor.ro`

## Example Connection (Python)

```python
import requests
from requests.auth import HTTPBasicAuth

SOLR_URL = "https://solr.peviitor.ro"
SOLR_USERNAME = os.environ.get("SOLR_USER")
SOLR_PASSWORD = os.environ.get("SOLR_PASSWD")

auth = HTTPBasicAuth(SOLR_USERNAME, SOLR_PASSWORD)
response = requests.get(f"{SOLR_URL}/solr/jobs/select", auth=auth, params={"q": "*:*"})
```

## GitHub Secrets Configuration

Add the following secrets to your GitHub repository:
- `SOLR_USER` - SOLR username
- `SOLR_PASSWD` - SOLR password
