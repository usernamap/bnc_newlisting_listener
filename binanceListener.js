// binanceListener.js
import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import { sendSMS } from './smsService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const BINANCE_URL = "https://www.binance.com/fr/support/announcement/new-cryptocurrency-listing?c=48&navId=48";
const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
};
const SENT_ITEMS_FILE = path.join(__dirname, "sent_items.json");

// Fetch announcements from Binance
async function fetchBinanceAnnouncements() {
    try {
        const response = await axios.get(BINANCE_URL, { headers: HEADERS });
        const $ = cheerio.load(response.data);
        const announcements = $("a");
        const binanceListings = [];

        announcements.each((_, element) => {
            const announcement = $(element);
            const title = announcement.text().trim();
            const link = announcement.attr("href");

            if (link && link.includes("support/announcement") && title.includes("Binance listera")) {
                const fullLink = "https://www.binance.com" + link;
                const dateElement = announcement.next("div");
                const dateStr = dateElement.length ? dateElement.text().trim() : "Date inconnue";
                
                let dateObj = null;
                try {
                    dateObj = new Date(dateStr);
                } catch (error) {
                    dateObj = null;
                }

                binanceListings.push({
                    title,
                    link: fullLink,
                    date_str: dateStr,
                    date_obj: dateObj
                });
            }
        });

        // Remove duplicates based on link
        const uniqueListings = Object.values(
            binanceListings.reduce((acc, item) => {
                acc[item.link] = item;
                return acc;
            }, {})
        );

        // Sort by date in ascending order (oldest first)
        return uniqueListings.sort((a, b) => {
            if (!a.date_obj && !b.date_obj) return 0;
            if (!a.date_obj) return 1;
            if (!b.date_obj) return -1;
            return a.date_obj - b.date_obj; // Reverted back to ascending order
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching announcements:`, error);
        return [];
    }
}

// Load previously sent items
async function loadSentItems() {
    try {
        const data = await fs.readFile(SENT_ITEMS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// Save sent items
async function saveSentItems(items) {
    await fs.writeFile(SENT_ITEMS_FILE, JSON.stringify(items, null, 4));
}

// Main function to check and send new listings
async function checkAndSendNewListings() {
    console.log(`[${new Date().toISOString()}] Vérification des nouvelles annonces (triées par date croissante)...`);
    
    try {
        const sentItems = await loadSentItems();
        const currentListings = await fetchBinanceAnnouncements();
        const newListings = currentListings.filter(item => !sentItems.includes(item.link));

        if (newListings.length > 0) {
            for (const listing of newListings) {
                const message = 
                    `📌 Nouvelle annonce Binance\n` +
                    `📅 Date : ${listing.date_str}\n` +
                    `💠 Titre : ${listing.title}\n` +
                    `🔗 Lien : ${listing.link}`;

                await sendSMS(message);
                sentItems.push(listing.link);
                console.log(`[${new Date().toISOString()}] Nouvel item envoyé : ${listing.title}`);
            }
            await saveSentItems(sentItems);
        } else {
            console.log(`[${new Date().toISOString()}] Aucune nouvelle annonce détectée.`);
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in check and send:`, error);
    }
}

// Initialize and run
async function main() {
    console.log(`[${new Date().toISOString()}] Démarrage du listener pour les annonces Binance...`);
    
    // Initial check
    await checkAndSendNewListings();

    // Schedule checks every 30 minutes
    setInterval(checkAndSendNewListings, 30 * 60 * 1000);
}

main().catch(error => {
    console.error(`[${new Date().toISOString()}] Fatal error:`, error);
    process.exit(1);
});