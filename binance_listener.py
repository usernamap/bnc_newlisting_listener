import requests
from bs4 import BeautifulSoup
from sms_service import send_sms
import schedule
import time
import os
import json
from datetime import datetime

# URL de la page des annonces de listings Binance
BINANCE_URL = "https://www.binance.com/fr/support/announcement/new-cryptocurrency-listing?c=48&navId=48"

# User-Agent pour éviter les blocages
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
}

# Fichier pour stocker les annonces déjà envoyées
SENT_ITEMS_FILE = "sent_items.json"


def fetch_binance_announcements():
    response = requests.get(BINANCE_URL, headers=HEADERS)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    announcements = soup.select("a")  # Sélection de tous les liens
    binance_listings = []

    for announcement in announcements:
        title = announcement.text.strip()
        link = announcement.get("href")
        if link and "support/announcement" in link and "Binance listera" in title:
            full_link = "https://www.binance.com" + link

            # Récupérer la date depuis un div voisin (ajuster si nécessaire)
            date_element = announcement.find_next_sibling("div")
            date_str = date_element.text.strip() if date_element else "Date inconnue"

            # Tentative de parsing de la date (adapter le format au besoin)
            try:
                date_obj = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                date_obj = None

            binance_listings.append(
                {
                    "title": title,
                    "link": full_link,
                    "date_str": date_str,
                    "date_obj": date_obj,
                }
            )

    # Déduplication interne par lien (si plusieurs occurrences identiques)
    unique_listings = {item["link"]: item for item in binance_listings}.values()

    # Tri par date_obj (celles sans date_obj en dernier)
    sorted_listings = sorted(
        unique_listings, key=lambda x: (x["date_obj"] is None, x["date_obj"])
    )

    return sorted_listings


def load_sent_items():
    if os.path.exists(SENT_ITEMS_FILE):
        with open(SENT_ITEMS_FILE, "r") as f:
            return json.load(f)
    return []


def save_sent_items(items):
    with open(SENT_ITEMS_FILE, "w") as f:
        json.dump(items, f, indent=4)


def check_and_send_new_listings():
    print(f"[{datetime.now()}] Vérification des nouvelles annonces...")
    sent_items = load_sent_items()
    current_listings = fetch_binance_announcements()
    new_listings = [item for item in current_listings if item["link"] not in sent_items]

    if new_listings:
        for listing in new_listings:
            # Mise en forme plus agréable du message SMS
            # On reste sobre, neutre et factuel, mais on ajoute un léger formatage
            message = (
                f"📌 Nouvelle annonce Binance\n"
                f"📅 Date : {listing['date_str']}\n"
                f"💠 Titre : {listing['title']}\n"
                f"🔗 Lien : {listing['link']}"
            )
            send_sms(message)
            sent_items.append(listing["link"])
            print(f"[{datetime.now()}] Nouvel item envoyé : {listing['title']}")
        save_sent_items(sent_items)
    else:
        print(f"[{datetime.now()}] Aucune nouvelle annonce détectée.")


# Planification de la tâche toutes les 30 minutes
schedule.every(30).minutes.do(check_and_send_new_listings)

if __name__ == "__main__":
    print(f"[{datetime.now()}] Démarrage du listener pour les annonces Binance...")
    # Exécution immédiate au lancement
    check_and_send_new_listings()
    # Boucle infinie pour la planification
    while True:
        schedule.run_pending()
        time.sleep(1)
