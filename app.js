// Importiere die Funktionen, die wir brauchen
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

// Initialisieren
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const lagerCollection = collection(db, "lagerbestand");

// DOM Elemente
const itemNameInput = document.getElementById('itemName');
const itemCountInput = document.getElementById('itemCount');
const addBtn = document.getElementById('addBtn');
const listContainer = document.getElementById('inventory-list');

// 1. Funktion: Neues Item hinzufügen
addBtn.addEventListener('click', async () => {
    const name = itemNameInput.value;
    const count = parseInt(itemCountInput.value);

    if (name && count) {
        await addDoc(lagerCollection, {
            name: name,
            count: count,
            createdAt: new Date()
        });
        itemNameInput.value = ''; // Feld leeren
        itemCountInput.value = '1';
    }
});

// 2. Funktion: Echtzeit-Liste anzeigen (Der Listener)
// Dieser Code läuft jedes Mal automatisch, wenn sich in der DB etwas ändert!
onSnapshot(lagerCollection, (snapshot) => {
    listContainer.innerHTML = ''; // Liste leeren und neu bauen

    snapshot.forEach((docSnap) => {
        const item = docSnap.data();
        const id = docSnap.id;

        // --- In der app.js innerhalb von onSnapshot(...) ---

listContainer.innerHTML = ''; 

snapshot.forEach((docSnap) => {
    const item = docSnap.data();
    const id = docSnap.id;

    // PRÜFUNG: Ist der Bestand 0 oder weniger?
    const isOutOfStock = item.count <= 0;
    
    // HTML Element erstellen
    const card = document.createElement('div');
    
    // WENN leer -> Klasse "out-of-stock" hinzufügen, SONST nur "item-card"
    card.className = isOutOfStock ? 'item-card out-of-stock' : 'item-card';

    // Inhalt der Karte
    // Wir ändern auch die Anzeige: Wenn 0, steht da "LEER" statt der Zahl
    card.innerHTML = `
        <div class="item-header">
            <span>${item.name}</span>
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

// 3. Funktionen global verfügbar machen (für die onclick im HTML)
window.updateStock = async (id, amount) => {
    const itemRef = doc(db, "lagerbestand", id);
    await updateDoc(itemRef, {
        count: increment(amount)
    });
};

window.deleteItem = async (id) => {
    if(confirm("Wirklich löschen?")) {
        await deleteDoc(doc(db, "lagerbestand", id));
    }
};
