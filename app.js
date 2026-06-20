const API_URL = "https://script.google.com/macros/s/AKfycbxfv6ZzffSGIbP8HyBS2GzBmjVhZCF41i5SZVo0GKuIK4Yi0JJH8Bci54Jz9GL-pEeGJw/exec";

let currentBagId = "";

window.onload = function() {
    loadSurplusData();
};

function switchView(view) {
    const consView = document.getElementById('view-consumer');
    const chefView = document.getElementById('view-chef');
    const tabCons = document.getElementById('tab-consumer');
    const tabChef = document.getElementById('tab-chef');

    if (view === 'consumer') {
        consView.classList.remove('hidden');
        chefView.classList.add('hidden');
        tabCons.className = "w-1/2 py-3 text-center font-medium text-emerald-600 border-b-2 border-emerald-600 transition-colors";
        tabChef.className = "w-1/2 py-3 text-center font-medium text-gray-500 hover:text-emerald-600 transition-colors";
        loadSurplusData();
    } else {
        chefView.classList.remove('hidden');
        consView.classList.add('hidden');
        tabChef.className = "w-1/2 py-3 text-center font-medium text-emerald-600 border-b-2 border-emerald-600 transition-colors";
        tabCons.className = "w-1/2 py-3 text-center font-medium text-gray-500 hover:text-emerald-600 transition-colors";
    }
}

async function loadSurplusData() {
    const container = document.getElementById('bags-container');
    const spinner = document.getElementById('loading-spinner');
    container.innerHTML = '';
    spinner.style.display = 'block';

    try {
        const response = await fetch(API_URL);
        const meals = await response.json();
        spinner.style.display = 'none';

        if(meals.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-400 py-6">No active surplus listed right now.</p>';
            return;
        }

        meals.forEach(meal => {
            if(parseInt(meal.quantity) <= 0) return;
            
            const card = document.createElement('div');
            card.className = "bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between space-y-3";
            card.innerHTML = `
                <div>
                    <div class="flex justify-between items-start">
                        <span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">${meal.location}</span>
                        <span class="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full">⏳ Before ${meal.pickupTime}</span>
                    </div>
                    <h3 class="text-base font-bold text-gray-900 mt-1.5">${meal.hotelName}</h3>
                    <p class="text-sm text-gray-500 font-medium">${meal.itemName}</p>
                </div>
                <div class="flex justify-between items-center pt-2 border-t border-gray-50">
                    <div>
                        <span class="text-xs line-through text-gray-400 font-medium">LKR ${meal.originalPrice}</span>
                        <span class="text-lg font-black text-gray-900 ml-1">LKR ${meal.discountPrice}</span>
                    </div>
                    <button onclick="openReserveModal('${meal.bagId}')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all">Reserve Box</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        spinner.innerHTML = '<span class="text-red-500">Error loading data. Check API configuration.</span>';
        console.error(error);
    }
}

// --- Reservation Modal Logic ---
function openReserveModal(bagId) {
    currentBagId = bagId;
    document.getElementById('reserve-modal').classList.remove('hidden');
}

function closeReserveModal() {
    document.getElementById('reserve-modal').classList.add('hidden');
    document.getElementById('modal-name').value = '';
    document.getElementById('modal-phone').value = '';
}

async function confirmReservation() {
    const name = document.getElementById('modal-name').value.trim() || "Guest";
    const phone = document.getElementById('modal-phone').value.trim() || "0771234567";
    
    closeReserveModal();
    document.getElementById('loading-spinner').style.display = 'block';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reserve', bagId: currentBagId, name: name, phone: phone })
        });
        
        const result = await response.json();
        document.getElementById('loading-spinner').style.display = 'none';

        if (result.status === "SUCCESS") {
            // Generate QR
            document.getElementById('qrcode').innerHTML = '';
            new QRCode(document.getElementById("qrcode"), { 
                text: `RESQ-${result.bagId}-${result.resId}`, 
                width: 140, 
                height: 140 
            });
            document.getElementById('modal-res-id').innerText = `ID: ${result.resId}`;
            document.getElementById('success-modal').classList.remove('hidden');
        } else {
            alert("Reservation failed: " + (result.reason || "Unknown error"));
        }
    } catch(err) {
        document.getElementById('loading-spinner').style.display = 'none';
        alert("Network error. Please try again.");
    }
}

function closeSuccessModal() {
    document.getElementById('success-modal').classList.add('hidden');
    loadSurplusData();
}

// --- Chef Form Logic ---
async function handleChefSubmit(event) {
    event.preventDefault();
    
    const payload = {
        action: 'create',
        hotelName: document.getElementById('chef-hotel').value,
        location: document.getElementById('chef-location').value,
        itemName: document.getElementById('chef-item').value,
        originalPrice: document.getElementById('chef-orig-price').value,
        discountPrice: document.getElementById('chef-disc-price').value,
        quantity: document.getElementById('chef-qty').value,
        pickupTime: document.getElementById('chef-time').value
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        if (result.status === "SUCCESS") {
            alert(`✅ Bag ${result.bagId} broadcasted successfully!`);
            document.getElementById('chef-form').reset();
            switchView('consumer');
        } else {
            alert("Failed to create listing.");
        }
    } catch(err) {
        alert("Error connecting to server.");
    }
}
