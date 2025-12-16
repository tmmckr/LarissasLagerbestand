// Importiere die Funktionen
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
const itemCategoryInput = document.getElementById('itemCategory'); // NEU
const addBtn = document.getElementById('addBtn');
const listContainer = document.getElementById('inventory-list');

// Globale Variable für aktuellen Filter
let currentCategoryFilter = 'alle';

// 1. Hinzufügen (Jetzt mit Kategorie)
addBtn.addEventListener('click', async () => {
    const name = itemNameInput.value;
    const count = parseInt(itemCountInput.value);
    const category = itemCategoryInput.value; // Wert aus Dropdown

    if (name && count) {
        try {
            await addDoc(lagerCollection, {
                name: name,
                count: count,
                category: category, // Speichern
                createdAt: new Date()
            });
            itemNameInput.value = ''; 
            itemCountInput.value = '1';
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
        
        // Fallback für alte Items ohne Kategorie
        const category = item.category || 'Sonstiges';

        const card = document.createElement('div');
        
        // WICHTIG: Wir speichern die Kategorie als Daten-Attribut im HTML
        card.dataset.category = category; 
        
        card.className = isOutOfStock ? 'item-card out-of-stock' : 'item-card';

        // Wir prüfen sofort, ob das Item zur aktuellen Auswahl passt
        if (currentCategoryFilter !== 'alle' && category !== currentCategoryFilter) {
            card.style.display = 'none';
        }

        card.innerHTML = `
            <div class="item-header">
                <div>
                    <span class="category-badge">${category}</span><br>
                    <span>${item.name}</span>
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
        // 1. Aktiven Button markieren
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // 2. Filter setzen
        currentCategoryFilter = tab.dataset.tab;

        // 3. Alle Karten durchgehen und ein/ausblenden
        const cards = document.querySelectorAll('.item-card');
        cards.forEach(card => {
            const cardCat = card.dataset.category;
            
            if (currentCategoryFilter === 'alle' || cardCat === currentCategoryFilter) {
                card.style.display = 'flex'; // Anzeigen (da wir flexbox nutzen)
            } else {
                card.style.display = 'none'; // Verstecken
            }
        });
    });
});

// Filter-Funktion (Einkaufsliste / Rot)
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

// Globale Funktionen
window.updateStock = async (id, amount) => {
    const itemRef = doc(db, "lagerbestand", id);
    await updateDoc(itemRef, { count: increment(amount) });
};

window.deleteItem = async (id) => {
    if(confirm("Löschen?")) {
        await deleteDoc(doc(db, "lagerbestand", id));
    }
};

// --- DARK MODE LOGIK ---

const toggleBtn = document.getElementById('darkModeToggle');
const body = document.body;
const icon = toggleBtn.querySelector('i');

// 1. Beim Laden prüfen: Hat der Nutzer schon eine Einstellung gespeichert?
const currentMode = localStorage.getItem('theme');

if (currentMode === 'dark') {
    enableDarkMode();
}

// 2. Klick-Event
toggleBtn.addEventListener('click', () => {
    if (body.classList.contains('dark-mode')) {
        disableDarkMode();
    } else {
        enableDarkMode();
    }
});

// Hilfsfunktionen
function enableDarkMode() {
    body.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark'); // Speichern
    icon.classList.remove('fa-moon');      // Mond weg
    icon.classList.add('fa-sun');          // Sonne hin
}

function disableDarkMode() {
    body.classList.remove('dark-mode');
    localStorage.setItem('theme', 'light'); // Speichern
    icon.classList.remove('fa-sun');        // Sonne weg
    icon.classList.add('fa-moon');          // Mond hin
}

// ==========================================
// === BARCODE SCANNER LOGIK ===
// ==========================================

const scanBtn = document.getElementById('scanBtn');
const closeScannerBtn = document.getElementById('closeScanner');
const scannerOverlay = document.getElementById('scanner-overlay');
let html5QrcodeScanner = null;

// API URL für Produktdaten
const API_URL = "https://world.openfoodfacts.org/api/v0/product/";

// 1. Scanner starten
scanBtn.addEventListener('click', () => {
    scannerOverlay.classList.remove('hidden');
    
    // Scanner initialisieren
    html5QrcodeScanner = new Html5Qrcode("reader");
    
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    // Kamera starten (Rückkamera bevorzugen)
    html5QrcodeScanner.start({ facingMode: "environment" }, config, onScanSuccess);
});

// 2. Wenn ein Code erkannt wurde
async function onScanSuccess(decodedText, decodedResult) {
    // Piepton oder Vibration wäre hier cool
    if (navigator.vibrate) navigator.vibrate(200);

    console.log(`Code gescannt: ${decodedText}`);
    
    // Scanner sofort stoppen und schließen
    stopScanner();

    // Nutzer-Feedback: "Lade..."
    itemNameInput.value = "Lade Produktdaten...";
    itemNameInput.disabled = true;

    try {
        // Produktdaten von OpenFoodFacts abrufen
        const response = await fetch(API_URL + decodedText + ".json");
        const data = await response.json();

        if (data.status === 1 && data.product) {
            // Treffer! Name holen (manchmal heißt es product_name_de oder generic_name)
            const productName = data.product.product_name_de || data.product.product_name || data.product.generic_name;
            
            itemNameInput.value = productName || "Unbekanntes Produkt";
            
            // Bonus: Versuchen, das Bild zu holen (optional)
            // console.log(data.product.image_url); 
            
            // Kategorie raten? (Simpel)
            if(data.product.categories_tags) {
               const tags = data.product.categories_tags.join(' ');
               if(tags.includes('hygiene') || tags.includes('beauty')) {
                   itemCategoryInput.value = 'Hygiene';
               } else if(tags.includes('food') || tags.includes('snack')) {
                   itemCategoryInput.value = 'Vorrat';
               }
            }

        } else {
            // Produkt nicht gefunden -> Barcode als Name eintragen
            itemNameInput.value = decodedText;
            alert("Produkt nicht in der Datenbank gefunden, Barcode eingetragen.");
        }
    } catch (error) {
        console.error("Fehler beim Abrufen:", error);
        itemNameInput.value = decodedText; // Fallback auf Barcode
    } finally {
        itemNameInput.disabled = false;
        itemNameInput.focus(); // Fokus ins Feld, damit man Menge eintippen kann
    }
}

// 3. Scanner stoppen (Abbrechen oder Erfolg)
function stopScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            scannerOverlay.classList.add('hidden');
            html5QrcodeScanner.clear();
        }).catch(err => console.log("Stop failed: ", err));
    } else {
        scannerOverlay.classList.add('hidden');
    }
}

closeScannerBtn.addEventListener('click', stopScanner);
