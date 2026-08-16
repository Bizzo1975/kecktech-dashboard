const { ipcRenderer } = require('electron');

// API endpoints
const API_BASE_URL = 'http://localhost:3000/api';

// State management
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// DOM Elements
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('.nav-links a');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegisterLink = document.getElementById('showRegister');
const showLoginLink = document.getElementById('showLogin');
const logoutBtn = document.getElementById('logoutBtn');
const userNameSpan = document.getElementById('userName');

// Navigation
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetPage = e.target.dataset.page;
        showPage(targetPage);
    });
});

function showPage(pageId) {
    pages.forEach(page => {
        page.classList.remove('active');
        if (page.id === `${pageId}Page`) {
            page.classList.add('active');
        }
    });
}

// Authentication
async function login(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (data.success) {
            authToken = data.data.token;
            currentUser = data.data.user;
            localStorage.setItem('authToken', authToken);
            userNameSpan.textContent = currentUser.name;
            showPage('lists');
            loadLists();
        } else {
            throw new Error(data.error.message);
        }
    } catch (error) {
        alert(error.message);
    }
}

async function register(name, email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();
        if (data.success) {
            alert('Registration successful! Please login.');
            showPage('login');
        } else {
            throw new Error(data.error.message);
        }
    } catch (error) {
        alert(error.message);
    }
}

function logout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('authToken');
    userNameSpan.textContent = 'Not logged in';
    showPage('login');
}

// Event Listeners
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
});

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    register(name, email, password);
});

showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    showPage('register');
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    showPage('login');
});

logoutBtn.addEventListener('click', logout);

// Grocery Lists
async function loadLists() {
    try {
        const response = await fetch(`${API_BASE_URL}/grocery/lists`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();
        if (data.success) {
            const listsContainer = document.getElementById('listsList');
            listsContainer.innerHTML = data.data.lists.map(list => `
                <div class="list-item">
                    <h3>${list.name}</h3>
                    <p>Type: ${list.type}</p>
                    <button onclick="editList(${list.id})">Edit</button>
                    <button onclick="deleteList(${list.id})">Delete</button>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading lists:', error);
    }
}

// Recipe Suggestions
async function loadRecipes(filter = 'all') {
    try {
        let endpoint = `${API_BASE_URL}/recipes/suggestions`;
        if (filter === 'expiring') {
            endpoint += '/expiring';
        }

        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();
        if (data.success) {
            const recipesContainer = document.getElementById('recipesList');
            recipesContainer.innerHTML = data.data.suggestions.map(recipe => `
                <div class="recipe-item">
                    <h3>${recipe.name}</h3>
                    <p>Match: ${recipe.matchPercentage}%</p>
                    ${recipe.missingIngredients.length ? `
                        <p>Missing ingredients: ${recipe.missingIngredients.join(', ')}</p>
                    ` : ''}
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading recipes:', error);
    }
}

// Price Comparison
async function searchItems(query) {
    try {
        const response = await fetch(`${API_BASE_URL}/grocery/items?search=${query}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();
        if (data.success) {
            const resultsContainer = document.getElementById('priceComparisonResults');
            resultsContainer.innerHTML = data.data.items.map(item => `
                <div class="price-item">
                    <h3>${item.name}</h3>
                    <button onclick="comparePrices(${item.id})">Compare Prices</button>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error searching items:', error);
    }
}

async function comparePrices(itemId) {
    try {
        const response = await fetch(`${API_BASE_URL}/prices/items/${itemId}/prices`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();
        if (data.success) {
            const resultsContainer = document.getElementById('priceComparisonResults');
            resultsContainer.innerHTML = `
                <div class="price-comparison">
                    <h3>${data.data.itemName}</h3>
                    <p>Best Price: $${data.data.bestPrice.price} at ${data.data.bestPrice.storeName}</p>
                    <p>Average Price: $${data.data.averagePrice}</p>
                    <h4>All Prices:</h4>
                    ${data.data.prices.map(price => `
                        <div class="store-price">
                            <p>${price.storeName}: $${price.price}</p>
                            <small>Last updated: ${new Date(price.lastUpdated).toLocaleDateString()}</small>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error comparing prices:', error);
    }
}

// Best Deals
async function loadDeals(category = '', minDiscount = 0) {
    try {
        const response = await fetch(`${API_BASE_URL}/prices/deals?category=${category}&minDiscount=${minDiscount}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();
        if (data.success) {
            const dealsContainer = document.getElementById('dealsList');
            dealsContainer.innerHTML = data.data.deals.map(deal => `
                <div class="deal-item">
                    <h3>${deal.itemName}</h3>
                    <p>Category: ${deal.category}</p>
                    <p>Best Price: $${deal.lowestPrice} at ${deal.bestStore.storeName}</p>
                    <p>Average Price: $${deal.averagePrice}</p>
                    <p>Discount: ${deal.discount.toFixed(2)}%</p>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading deals:', error);
    }
}

// Event Listeners for features
document.getElementById('createListBtn').addEventListener('click', () => {
    // TODO: Implement create list functionality
});

document.getElementById('addItemBtn').addEventListener('click', () => {
    // TODO: Implement add item functionality
});

document.getElementById('recipeFilter').addEventListener('change', (e) => {
    loadRecipes(e.target.value);
});

document.getElementById('searchBtn').addEventListener('click', () => {
    const query = document.getElementById('itemSearch').value;
    searchItems(query);
});

document.getElementById('categoryFilter').addEventListener('change', (e) => {
    const minDiscount = document.getElementById('minDiscount').value;
    loadDeals(e.target.value, minDiscount);
});

document.getElementById('minDiscount').addEventListener('change', (e) => {
    const category = document.getElementById('categoryFilter').value;
    loadDeals(category, e.target.value);
});

// Initialize
if (authToken) {
    // TODO: Validate token and load user data
    showPage('lists');
    loadLists();
} else {
    showPage('login');
} 