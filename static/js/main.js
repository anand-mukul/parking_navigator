// ====== Live Parking Status Updates ======

// Format ISO date to readable format (IST)
function formatDateTime(isoString) {
    if (!isoString) return 'Never';
    const utcString = isoString.endsWith('Z') ? isoString : isoString + 'Z';

    const date = new Date(utcString);
    const formatted = date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true 
    });

    return formatted;
}

function fetchStatuses() {
    const cards = document.querySelectorAll("[id^='status-']");
    cards.forEach(card => {
        const areaId = card.id.split("-")[1];
        fetch(`/api/status/${areaId}`)
            .then(res => {
                if (!res.ok) throw new Error('Network response was not ok');                
                return res.json();
            })
            .then(data => {
                if (data.error) {
                    card.innerHTML = `<span class="text-danger">❌ Error loading</span>`;
                } else {
                    // Build status HTML
                    let statusHTML = '<div class="mb-2">';
                    
                    data.statuses.forEach(s => {
                        const icon = s.vehicle_type === 'car' ? '🚗' : s.vehicle_type === 'bike' ? '🏍️' : '🚌';
                        const badgeClass = s.available > 0 ? 'success' : 'danger';
                        
                        statusHTML += `
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span>${icon} ${s.vehicle_type.charAt(0).toUpperCase() + s.vehicle_type.slice(1)}:</span>
                                <span class="badge bg-${badgeClass}">
                                    ${s.available}/${s.capacity} available
                                </span>
                            </div>
                        `;
                    });
                    
                    statusHTML += '</div>';
                    
                    // Overall status badge
                    const totalAvailable = data.available_spots;
                    const overallBadge = totalAvailable > 0 ? 'success' : 'danger';
                    
                    statusHTML += `
                        <div class="mt-2">
                            <span class="badge bg-${overallBadge} w-100">
                                Total: ${totalAvailable} spots available
                            </span>
                        </div>
                        <small class="text-muted d-block mt-2">
                            🕒 Updated: ${formatDateTime(data.last_updated)}
                        </small>
                    `;
                    
                    card.innerHTML = statusHTML;
                }
            })
            .catch(err => {
                console.error('Fetch error:', err);
                card.innerHTML = `<span class="text-danger">⚠️ Unable to fetch status</span>`;
            });
    });
}

// ====== Search Functionality ======
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("keyup", () => {
            const filter = searchInput.value.toLowerCase().trim();
            const cards = document.querySelectorAll("#areasContainer > div");

            cards.forEach(cardWrapper => {
                const card = cardWrapper.querySelector('.card');
                if (!card) return;
                
                const title = card.querySelector(".card-title")?.innerText.toLowerCase() || '';
                const location = card.querySelector(".card-text")?.innerText.toLowerCase() || '';
                
                if (title.includes(filter) || location.includes(filter)) {
                    cardWrapper.style.display = "";
                } else {
                    cardWrapper.style.display = "none";
                }
            });
        });
    }
});