import os
import sys
from notion_client import Client
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()
notion = Client(auth=os.environ["NOTION_TOKEN"])

def get_blocks(block_id):
    results = notion.blocks.children.list(block_id=block_id).get('results', [])
    text_content = ""
    for block in results:
        b_type = block["type"]
        if b_type in ["paragraph", "heading_1", "heading_2", "heading_3", "bulleted_list_item", "numbered_list_item", "to_do"]:
            rich_text = block[b_type].get("rich_text", [])
            text = "".join([t["plain_text"] for t in rich_text])
            if b_type == "to_do":
                checked = "x" if block[b_type].get("checked") else " "
                text_content += f"- [{checked}] {text}\n"
            elif b_type == "bulleted_list_item":
                text_content += f"- {text}\n"
            elif b_type == "numbered_list_item":
                text_content += f"1. {text}\n"
            elif "heading" in b_type:
                level = b_type.split("_")[-1]
                text_content += f"\n{'#' * int(level)} {text}\n\n"
            else:
                text_content += f"{text}\n"
    return text_content

print(get_blocks("3c100759-d677-81f9-80f0-d35c98b33794"))
