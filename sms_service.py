import requests
import time
import schedule
from datetime import datetime
import os
from dotenv import load_dotenv

# Charger les variables d'environnement depuis le fichier .env
load_dotenv()


def send_sms(message):
    api_url = "https://smsapi.free-mobile.fr/sendmsg"
    user = os.getenv("SMS_USER")  # Lecture de l'ID utilisateur depuis .env
    password = os.getenv("SMS_PASSWORD")  # Lecture du mot de passe depuis .env

    if not user or not password:
        print(
            f"[{datetime.now()}] Erreur: Identifiants SMS non définis. Vérifiez votre fichier .env."
        )
        return

    try:
        params = {"user": user, "pass": password, "msg": message}
        response = requests.get(api_url, params=params)
        if response.status_code == 200:
            print(f"[{datetime.now()}] SMS envoyé avec succès: {message}")
        else:
            print(
                f"[{datetime.now()}] Échec de l'envoi du SMS, statut: {response.status_code}"
            )
    except Exception as e:
        print(f"[{datetime.now()}] Erreur lors de l'envoi du SMS: {str(e)}")


if __name__ == "__main__":
    while True:
        schedule.run_pending()
        time.sleep(1)
