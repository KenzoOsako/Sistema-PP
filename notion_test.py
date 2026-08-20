import os
import sys
from notion_client import Client
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

notion = Client(auth=os.environ["NOTION_TOKEN"])

try:
    results = notion.search(query="").get("results", [])
    if not results:
        print("Nenhuma página ou banco de dados compartilhado com a integração ainda.")
    else:
        print("Acesso confirmado! A integração pode ver as seguintes páginas/tabelas:")
        for result in results:
            title = 'Sem Título'
            if result['object'] == 'database' and result.get('title'):
                title = ''.join([t.get('plain_text', '') for t in result['title']])
            elif result['object'] == 'page':
                for key, prop in result.get('properties', {}).items():
                    if prop['type'] == 'title':
                        title = ''.join([t.get('plain_text', '') for t in prop['title']])
                        break
            print(f"- [{result['object'].upper()}] {title} (ID: {result['id']})")
except Exception as e:
    print(f"Erro ao conectar: {e}")
