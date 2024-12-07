// smsService.js
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export async function sendSMS(message) {
    const apiUrl = "https://smsapi.free-mobile.fr/sendmsg";
    const user = process.env.SMS_USER;
    const password = process.env.SMS_PASSWORD;

    if (!user || !password) {
        console.error(`[${new Date().toISOString()}] Erreur: Identifiants SMS non définis. Vérifiez votre fichier .env.`);
        return;
    }

    try {
        const response = await axios.get(apiUrl, {
            params: {
                user,
                pass: password,
                msg: message
            }
        });

        if (response.status === 200) {
            console.log(`[${new Date().toISOString()}] SMS envoyé avec succès: ${message}`);
        } else {
            console.error(`[${new Date().toISOString()}] Échec de l'envoi du SMS, statut: ${response.status}`);
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Erreur lors de l'envoi du SMS:`, error.message);
    }
}