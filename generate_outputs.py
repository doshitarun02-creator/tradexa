import os

src_html_path = r"d:\tradexa\tradexa-frontend\dist\index.html"
dest_dir = r"C:\Users\shraw\Downloads\tra"

mappings = {
    "index-3.html": "#/markets",
    "market-3.html": "#/markets",
    "login.html": "#/login",
    "signup.html": "#/register",
    "history.html": "#/activity",
    "profile-1.html": "#/portfolio",
    "wallet-3.html": "#/portfolio",
    "wallet-4.html": "#/portfolio",
    "withdraw.html": "#/portfolio"
}

def generate():
    if not os.path.exists(src_html_path):
        print(f"Source file {src_html_path} not found!")
        return

    with open(src_html_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    for filename, route in mappings.items():
        # Insert routing script right after <head>
        script = f'\n    <script>\n      if (!window.location.hash || window.location.hash === "#/") {{\n        window.location.hash = "{route}";\n      }}\n    </script>'
        modified_content = html_content.replace("<head>", "<head>" + script)
        
        dest_path = os.path.join(dest_dir, filename)
        with open(dest_path, "w", encoding="utf-8") as out_f:
            out_f.write(modified_content)
        print(f"Generated {dest_path} -> route {route}")

if __name__ == "__main__":
    generate()
