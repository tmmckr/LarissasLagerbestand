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
const itemImageInput = document.getElementById('itemImage'); // NEU
const addBtn = document.getElementById('addBtn');
const listContainer = document.getElementById('inventory-list');

let currentCategoryFilter = 'alle';

// 1. Hinzufügen (Jetzt mit BILD!)
addBtn.addEventListener('click', async () => {
    const name = itemNameInput.value;
    const count = parseInt(itemCountInput.value);
    const category = itemCategoryInput.value;
    const imageUrl = itemImageInput.value; // Bild URL holen

    if (name && count) {
        try {
            await addDoc(lagerCollection, {
                name: name,
                count: count,
                category: category,
                image: imageUrl, // Bild mitspeichern
                createdAt: new Date()
            });
            // Reset
            itemNameInput.value = ''; 
            itemCountInput.value = '1';
            itemImageInput.value = ''; // Bild-Speicher leeren
        } catch (error) {
            console.error("Fehler: ", error);
        }
    } else {
        alert("Bitte Namen und Menge eingeben!");
    }
});

// 2. Liste anzeigen (Jetzt mit Bild-Anzeige)
onSnapshot(lagerCollection, (snapshot) => {
    listContainer.innerHTML = ''; 

    snapshot.forEach((docSnap) => {
        const item = docSnap.data();
        const id = docSnap.id;
        const isOutOfStock = item.count <= 0;
        const category = item.category || 'Sonstiges';

        const card = document.createElement('div');
        card.dataset.category = category;
        card.className = isOutOfStock ? 'item-card out-of-stock' : 'item-card';

        if (currentCategoryFilter !== 'alle' && category !== currentCategoryFilter) {
            card.style.display = 'none';
        }

        // Bild-HTML bauen (nur wenn ein Bild da ist)
        let imageHtml = '';
        if (item.image) {
            imageHtml = `<img src="${item.image}" alt="Produktbild" style="width: 50px; height: 50px; object-fit: contain; border-radius: 5px; margin-right: 10px;">`;
        }

        card.innerHTML = `
            <div class="item-header">
                <div style="display: flex; align-items: center;">
                    ${imageHtml} <div>
                        <span class="category-badge">${category}</span><br>
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

// 3. Tab-Filter Logik
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

// Filter Checkbox
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

// WhatsApp Button
const whatsappBtn = document.getElementById('whatsappBtn');
if(whatsappBtn) {
    whatsappBtn.addEventListener('click', () => {
        const emptyCards = document.querySelectorAll('.item-card.out-of-stock');
        if (emptyCards.length === 0) {
            alert("Alles voll! 🎉"); return;
        }
        let message = "👋 Einkaufsliste für Larissas Lager:\n\n";
        emptyCards.forEach(card => {
            // Namen finden (etwas komplexer jetzt wegen Bild)
            // Wir suchen das zweite span im Header-Div
            const textDiv = card.querySelector('.item-header > div > div'); // Das div neben dem Bild
            const spans = textDiv.querySelectorAll('span');
            const itemName = spans[1].innerText; // Der Name ist das 2. Span (nach Badge)
            message += `- ${itemName}\n`;
        });
        message += "\nDanke! 🛒";
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    });
}

// Dark Mode
const toggleBtn = document.getElementById('darkModeToggle');
const body = document.body;
if(toggleBtn) {
    const icon = toggleBtn.querySelector('i');
    if (localStorage.getItem('theme') === 'dark') enableDarkMode();
    
    toggleBtn.addEventListener('click', () => {
        if (body.classList.contains('dark-mode')) disableDarkMode();
        else enableDarkMode();
    });

    function enableDarkMode() {
        body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }
    function disableDarkMode() {
        body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

// ================= SCANNNER LOGIK =================

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
            
            // --- HIER HOLEN WIR DAS BILD ---
            // Wir nehmen das kleine Thumbnail
            const img = data.product.image_front_small_url || data.product.image_small_url || '';
            itemImageInput.value = img; // In das versteckte Feld speichern

            // Kategorie raten
            if(data.product.categories_tags) {
               const tags = data.product.categories_tags.join(' ');
               if(tags.includes('hygiene') || tags.includes('beauty')) itemCategoryInput.value = 'Hygiene';
               else if(tags.includes('food') || tags.includes('snack')) itemCategoryInput.value = 'Vorrat';
            }
        } else {
            itemNameInput.value = decodedText;
            alert("Produkt nicht gefunden.");
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

// Global
window.updateStock = async (id, amount) => {
    const itemRef = doc(db, "lagerbestand", id);
    await updateDoc(itemRef, { count: increment(amount) });
};
window.deleteItem = async (id) => {
    if(confirm("Löschen?")) await deleteDoc(doc(db, "lagerbestand", id));
};
