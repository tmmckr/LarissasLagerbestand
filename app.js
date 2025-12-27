import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- HIER DEINE CONFIG EINFÜGEN ---
const firebaseConfig = {
  apiKey: "AIzaSyB4A5lOWCN2gUBrlqlmnpSCnUBvgrhfmvg",
  authDomain: "larissaslagerbestand.firebaseapp.com",
  projectId: "larissaslagerbestand",
  storageBucket: "larissaslagerbestand.firebasestorage.app",
  messagingSenderId: "279838975740",
  appId: "1:279838975740:web:50abf932ec6e04ac5b1979"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const lagerCollection = collection(db, "lagerbestand");

// DOM Elemente
const itemNameInput = document.getElementById('itemName');
const itemCountInput = document.getElementById('itemCount');
const itemCategoryInput = document.getElementById('itemCategory');
const itemShopInput = document.getElementById('itemShop'); // NEU
const itemImageInput = document.getElementById('itemImage');
const addBtn = document.getElementById('addBtn');
const listContainer = document.getElementById('inventory-list');

let currentCategoryFilter = 'alle';

// 1. Hinzufügen (Jetzt mit Shop!)
addBtn.addEventListener('click', async () => {
    const name = itemNameInput.value;
    const count = parseInt(itemCountInput.value);
    const category = itemCategoryInput.value;
    const shop = itemShopInput.value; // Laden holen
    const imageUrl = itemImageInput.value;

    if (name && count) {
        try {
            await addDoc(lagerCollection, {
                name: name,
                count: count,
                category: category,
                shop: shop, // Laden speichern
                image: imageUrl,
                createdAt: new Date()
            });
            // Reset
            itemNameInput.value = ''; 
            itemCountInput.value = '1';
            itemImageInput.value = '';
            // Shop lassen wir vielleicht stehen oder setzen ihn zurück? 
            // Besser zurücksetzen:
            itemShopInput.value = '';
        } catch (error) {
            console.error("Fehler: ", error);
        }
    } else {
        alert("Bitte Namen und Menge eingeben!");
    }
});

// 2. Liste anzeigen
onSnapshot(lagerCollection, (snapshot) => {
    listContainer.innerHTML = ''; 

    snapshot.forEach((docSnap) => {
        const item = docSnap.data();
        const id = docSnap.id;
        const isOutOfStock = item.count <= 0;
        const category = item.category || 'Sonstiges';
        const shop = item.shop || ''; // Laden laden (kann leer sein bei alten Items)

        const card = document.createElement('div');
        card.dataset.category = category;
        card.className = isOutOfStock ? 'item-card out-of-stock' : 'item-card';

        if (currentCategoryFilter !== 'alle' && category !== currentCategoryFilter) {
            card.style.display = 'none';
        }

        // Bild
        let imageHtml = '';
        if (item.image) {
            imageHtml = `<img src="${item.image}" alt="Produktbild" style="width: 50px; height: 50px; object-fit: contain; border-radius: 5px; margin-right: 10px;">`;
        }

        // Shop Badge HTML (nur anzeigen, wenn ein Laden gespeichert ist)
        let shopBadgeHtml = '';
        if (shop) {
            shopBadgeHtml = `<span class="shop-badge"><i class="fas fa-shopping-basket"></i> ${shop}</span>`;
        }

        card.innerHTML = `
            <div class="item-header">
                <div style="display: flex; align-items: center;">
                    ${imageHtml}
                    <div>
                        <div class="badge-container">
                            <span class="category-badge">${category}</span>
                            ${shopBadgeHtml} </div>
                        <span>${item.name}</span>
                    </div>
                </div>
                <button class="delete-btn" onclick="deleteItem('${id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="controls">
                <button class="control-btn" onclick="updateStock('${id}', -1)">
                    <i class="fas fa-minus"></i>
                </button>
                <span class="count-display">
                    ${isOutOfStock ? 'NACHKAUFEN!' : item.count}
                </span>
                <button class="control-btn" onclick="updateStock('${id}', 1)">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
        listContainer.appendChild(card);
    });
});

// 3. WhatsApp Button (Jetzt sortiert nach Laden!)
const whatsappBtn = document.getElementById('whatsappBtn');
if(whatsappBtn) {
    whatsappBtn.addEventListener('click', () => {
        const emptyCards = document.querySelectorAll('.item-card.out-of-stock');
        if (emptyCards.length === 0) {
            alert("Alles voll! 🎉"); return;
        }

        let message = "👋 Einkaufsliste für Larissas Lager:\n\n";
        
        // Wir sammeln die Daten erst, um sie schön zu formatieren
        let itemsToSend = [];

        emptyCards.forEach(card => {
            // Namen extrahieren
            // Struktur: header -> div -> div (textDiv) -> span (Name ist das letzte span im textDiv)
            const textDiv = card.querySelector('.item-header > div > div'); 
            // Im textDiv sind jetzt: badge-container und das span mit dem Namen.
            // Der Name ist das letzte Element in textDiv, das kein badge-container ist, oder einfach das letzte child.
            // Um sicher zu gehen holen wir den Text aus dem letzten <span> im textDiv, das NICHT badge ist.
            // Einfacherer Weg: Wir speichern den Namen als data-Attribut an der Karte beim Erstellen!
            // Aber um den Code oben nicht zu sehr zu ändern, suchen wir den Textknoten:
            
            // Neuer Versuch Selektor: Der Name steht im `item-header` -> `div` -> `div` -> letztes `span`
            const spans = textDiv.querySelectorAll('span');
            // Das letzte Span ist der Name (da badges davor kommen)
            const itemName = spans[spans.length - 1].innerText; 
            
            // Laden holen (aus dem Badge, falls vorhanden)
            const shopBadge = card.querySelector('.shop-badge');
            const shopName = shopBadge ? shopBadge.innerText.trim() : 'Sonstiges';

            itemsToSend.push({ name: itemName, shop: shopName });
        });

        // Sortieren nach Laden (Damit alle Rewe Sachen untereinander stehen)
        itemsToSend.sort((a, b) => a.shop.localeCompare(b.shop));

        itemsToSend.forEach(item => {
            // Format: "- Nutella [REWE]"
            // Wir bereinigen den Shop-Namen vom Icon Text falls nötig, aber innerText hat meist nur Text
            message += `- ${item.name}`;
            if(item.shop !== 'Sonstiges') {
                message += ` (${item.shop})`;
            }
            message += `\n`;
        });

        message += "\nDanke! 🛒";
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    });
}

// ... Restlicher Code (Tabs, Filter, DarkMode, Scanner, Global Fn) bleibt gleich ...
// Hier zur Sicherheit kurz eingefügt die Tab Logik etc, damit du copy-paste machen kannst:

const tabs = document.querySelectorAll('.tab-btn');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentCategoryFilter = tab.dataset.tab;
        
        const cards = document.querySelectorAll('.item-card');
        cards.forEach(card => {
            const cardCat = card.dataset.category;
            if (currentCategoryFilter === 'alle' || cardCat === currentCategoryFilter) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    });
});

const filterCheckbox = document.getElementById('showMissingOnly');
if(filterCheckbox) {
    filterCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            listContainer.classList.add('filter-active');
        } else {
            listContainer.classList.remove('filter-active');
        }
    });
}

const toggleBtn = document.getElementById('darkModeToggle');
const body = document.body;
if(toggleBtn) {
    const icon = toggleBtn.querySelector('i');
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
        icon.classList.remove('fa-moon'); icon.classList.add('fa-sun');
    }
    
    toggleBtn.addEventListener('click', () => {
        if (body.classList.contains('dark-mode')) {
            body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
            icon.classList.remove('fa-sun'); icon.classList.add('fa-moon');
        } else {
            body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
            icon.classList.remove('fa-moon'); icon.classList.add('fa-sun');
        }
    });
}

// Scanner Logik
const scanBtn = document.getElementById('scanBtn');
const closeScannerBtn = document.getElementById('closeScanner');
const scannerOverlay = document.getElementById('scanner-overlay');
let html5QrcodeScanner = null;
const API_URL = "https://world.openfoodfacts.org/api/v0/product/";

if(scanBtn) {
    scanBtn.addEventListener('click', () => {
        scannerOverlay.classList.remove('hidden');
        html5QrcodeScanner = new Html5Qrcode("reader");
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        html5QrcodeScanner.start({ facingMode: "environment" }, config, onScanSuccess);
    });
}

async function onScanSuccess(decodedText, decodedResult) {
    if (navigator.vibrate) navigator.vibrate(200);
    stopScanner();
    itemNameInput.value = "Lade...";
    itemNameInput.disabled = true;

    try {
        const response = await fetch(API_URL + decodedText + ".json");
        const data = await response.json();

        if (data.status === 1 && data.product) {
            const productName = data.product.product_name_de || data.product.product_name || data.product.generic_name;
            itemNameInput.value = productName || "Unbekannt";
            const img = data.product.image_front_small_url || data.product.image_small_url || '';
            itemImageInput.value = img;

            // Kategorie UND Shop raten?
            // Marken wie "Balea" -> dm, "Isana" -> Rossmann
            if(data.product.brands) {
                const brand = data.product.brands.toLowerCase();
                if(brand.includes('balea')) itemShopInput.value = 'dm';
                if(brand.includes('isana')) itemShopInput.value = 'Rossmann';
                if(brand.includes('ja!')) itemShopInput.value = 'Rewe';
                if(brand.includes('gut & günstig')) itemShopInput.value = 'Edeka';
            }

            if(data.product.categories_tags) {
               const tags = data.product.categories_tags.join(' ');
               if(tags.includes('hygiene') || tags.includes('beauty')) itemCategoryInput.value = 'Hygiene';
               else if(tags.includes('food') || tags.includes('snack')) itemCategoryInput.value = 'Vorrat';
            }
        } else {
            itemNameInput.value = decodedText;
        }
    } catch (error) {
        console.error(error);
        itemNameInput.value = decodedText;
    } finally {
        itemNameInput.disabled = false;
        itemNameInput.focus();
    }
}

function stopScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            scannerOverlay.classList.add('hidden');
            html5QrcodeScanner.clear();
        }).catch(err => console.log(err));
    } else {
        scannerOverlay.classList.add('hidden');
    }
}
if(closeScannerBtn) closeScannerBtn.addEventListener('click', stopScanner);

window.updateStock = async (id, amount) => {
    const itemRef = doc(db, "lagerbestand", id);
    await updateDoc(itemRef, { count: increment(amount) });
};
window.deleteItem = async (id) => {
    if(confirm("Löschen?")) await deleteDoc(doc(db, "lagerbestand", id));
};
