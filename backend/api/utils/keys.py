from dotenv import load_dotenv
import os
# Creo esta clase para poder sacar directamente las keys del .env y poder usarlas más 
# rápidamente en los otros archivos sin tener que sacarlo del env manualmente en cada una
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))