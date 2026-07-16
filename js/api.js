/**
 * Gifting Needs - API Abstraction Layer
 * Dual-Mode Support:
 * 1. HTTP API Mode (Active when running under Express Server)
 * 2. localStorage Mock Mode (Active when running as local static files, i.e. file:// protocol)
 */

const GiftingAPI = (() => {
  // Detect if running via Web Server or Local Static File
  const isWebServer = window.location.protocol.startsWith('http');
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const BASE_URL = isWebServer 
    ? (isLocalhost ? `${window.location.origin}` : 'https://giftingneeds-backend-748096979929.europe-north1.run.app') 
    : '';
  
  // Local storage simulation database keys
  const STORAGE_KEYS = {
    PRODUCTS: 'gn_sim_products',
    INQUIRIES: 'gn_sim_inquiries',
    DESIGN: 'gn_sim_design',
    USER: 'gn_sim_current_user',
    LOGS: 'gn_sim_logs'
  };

  // Default fallback data (matches server defaults for localStorage mode)
  const FALLBACK_PRODUCTS = [
    { id: 'p1', category: 'tech', categoryLabel: 'Electronics & Tech', badge: 'popular', badgeText: 'Bestseller', title: 'Custom Brand 10,000mAh Power Bank', price: 649, minQty: 50, icon: '🔋', image: 'images/products/power_bank.jpg', desc: 'Sleek, durable, and high-capacity metallic power bank for the modern professional. Laser-etched branding on brushed aluminum ensures your logo leaves a lasting impression.', specs: { 'Material': 'Aluminum Alloy', 'Capacity': '10,000 mAh', 'Output': 'Dual 2.1A Quick Charge' } },
    { id: 'p2', category: 'tech', categoryLabel: 'Electronics & Tech', badge: 'new', badgeText: 'New', title: 'Executive Bamboo Wireless Charging Pad', price: 499, minQty: 100, icon: '🔌', image: 'images/products/wireless_charger.jpg', desc: 'Eco-friendly 15W fast-charging wireless charger for a clutter-free, productive workspace. Natural bamboo surface with custom logo engraving — where tech meets sustainability.', specs: { 'Material': 'Natural Bamboo', 'Output': '15W Fast Charge' } },
    { id: 'p3', category: 'tech', categoryLabel: 'Electronics & Tech', badge: '', badgeText: '', title: 'Metal Ring Bluetooth Speaker & Mic', price: 899, minQty: 50, icon: '🔊', image: 'images/products/bluetooth_speaker.jpg', desc: 'Compact, water-resistant premium metal speaker for seamless music and hands-free conference calls. Pairs in seconds via Bluetooth 5.2 — a statement gift for top performers.', specs: { 'Power': '5W Audio', 'Bluetooth': 'v5.2 BLE' } },
    { id: 'p4', category: 'drinkware', categoryLabel: 'Premium Drinkware', badge: 'popular', badgeText: 'High Demand', title: 'Insulated Hydro Vacuum Flask (500ml)', price: 450, minQty: 100, icon: '🥤', image: 'images/products/flask.jpg', desc: 'Insulated, premium double-wall flask that keeps drinks hot 12 hours, cold 24 hours. Gold-embossed corporate branding on a matte-black finish — elegance at every sip.', specs: { 'Material': '304 Stainless Steel', 'Volume': '500 ml' } },
    { id: 'p5', category: 'drinkware', categoryLabel: 'Premium Drinkware', badge: 'new', badgeText: 'Eco-Choice', title: 'Coffee Husk Reusable Coffee Cup', price: 199, minQty: 200, icon: '☕', image: 'images/products/eco_cup.jpg', desc: 'Biodegradable coffee cup crafted from authentic agricultural waste coffee husks. Durable, leak-proof, BPA-free, and micro-wave safe.', specs: { 'Material': 'Husk Bio-composite', 'Capacity': '350 ml' } },
    { id: 'p6', category: 'drinkware', categoryLabel: 'Premium Drinkware', badge: '', badgeText: '', title: 'Rustic Copper Drinkware Set', price: 1250, minQty: 25, icon: '🍶', image: 'images/products/copper_set.jpg', desc: 'Exquisite handcrafted 99.9% pure copper drinkware set in a velvet-lined sandalwood box. A luxurious Ayurvedic wellness gift that speaks to heritage, health, and thoughtfulness.', specs: { 'Material': '99.9% Copper', 'Bottle': '950 ml' } },
    { id: 'p7', category: 'stationery', categoryLabel: 'Desk Utilities & Planners', badge: '', badgeText: '', title: 'Elite Cork Cover Planner & Organizer', price: 349, minQty: 100, icon: '📓', image: 'images/products/planner.jpg', desc: 'A5 executive diary with a soft-touch organic cork cover. Includes a matching bamboo stylus ball pen and business card slots.', specs: { 'Paper Quality': '80 GSM Acid-free', 'Pages': '192 pages' } },
    { id: 'p8', category: 'stationery', categoryLabel: 'Desk Utilities & Planners', badge: 'popular', badgeText: 'Classic', title: 'Solid Oak Desk Organizer & Pen Stand', price: 399, minQty: 50, icon: '🪵', image: 'images/products/desk_organizer.jpg', desc: 'Handcrafted solid wood desktop organizer. Features phone docking slot, watch cradle, paperclip tray, and dual pen holder.', specs: { 'Wood Type': 'Sustainable Oak', 'Finish': 'Linseed Oil' } },
    { id: 'p9', category: 'apparel', categoryLabel: 'Apparel & Bags', badge: 'popular', badgeText: 'Bestseller', title: 'Premium Organic Cotton Polo T-Shirt', price: 399, minQty: 100, icon: '👕', image: 'images/products/polo_shirt.jpg', desc: '220 GSM pre-shrunk combed organic cotton polo. Perfect stitching, elegant side slits, and highly durable custom embroidery of your logo.', specs: { 'Material': '100% Cotton', 'Weight': '220 GSM' } },
    { id: 'p10', category: 'apparel', categoryLabel: 'Apparel & Bags', badge: 'new', badgeText: 'Luxury', title: 'Anti-Theft Executive Laptop Backpack', price: 1450, minQty: 30, icon: '🎒', image: 'images/products/backpack.jpg', desc: 'Sleek tech bag with concealed zippers, USB charging, fits 16" laptop.', specs: { 'Material': '300D Polyester', 'Capacity': '20 Liters' } },
    { id: 'p11', category: 'hampers', categoryLabel: 'Festive & Gourmet Hampers', badge: 'festive', badgeText: 'Diwali Special', title: 'Royal Mysore Gold Sweets & Nut Hamper', price: 1850, minQty: 25, icon: '🎁', image: 'images/diwali_hamper_category.jpg', desc: 'A gourmet Diwali celebration in a gold-foiled box — premium cashews, almonds, pistachios, organic forest honey, handmade chocolates, and a traditional brass diya. Pure festive delight.', specs: { 'Packaging': 'Premium Gift Box', 'Shelf Life': '90 Days' } },
    { id: 'p12', category: 'hampers', categoryLabel: 'Festive & Gourmet Hampers', badge: 'festive', badgeText: 'Green Hamper', title: 'Eco-Friendly Zero Waste Gifting Box', price: 999, minQty: 50, icon: '🌱', image: 'images/eco_gifts_category.jpg', desc: 'Bamboo planter, seed paper calendar, cork diary, and seed balls.', specs: { 'Material': 'Recycled Kraft Board', 'Biodegradable': '98%' } },
    { id: 'p13', category: 'trophies', categoryLabel: 'Trophies & Mementos', badge: '', badgeText: '', title: 'Gilded Diamond Cut Crystal Award', price: 1800, minQty: 10, icon: '🏆', image: 'images/about_warehouse.jpg', desc: 'High-clarity optical grade crystal award on mahogany wood base.', specs: { 'Material': 'K9 Crystal + Mahogany', 'Height': '9 Inches' } }
  ];

  const DEFAULT_DESIGN = {
    theme: "light",
    colors: {
      primary: "#0F4C3A",
      primaryLight: "#15634C",
      primaryGlow: "rgba(15, 76, 58, 0.15)",
      bgSecondary: "#F4F6F4",
      bgCard: "#FFFFFF",
      textPrimary: "#1B2B26",
      textMuted: "#6B7A75",
      border: "rgba(15, 76, 58, 0.12)",
      gold: "#D4AF37",
      goldBright: "#F3C63F",
      goldGlow: "rgba(212, 175, 55, 0.15)",
      crimson: "#9E2A2B",
      crimsonLight: "#BE3E40",
      btnGrad: "linear-gradient(135deg, #0F4C3A 0%, #0A3427 100%)",
      goldGrad: "linear-gradient(135deg, #D4AF37 0%, #AA821C 100%)"
    },
    fonts: {
      headings: "'Playfair Display', serif",
      body: "'Outfit', sans-serif"
    },
    slides: [
      { id: 's1', active: true, tag: "Onboarding Excellence", title: "Elevate Your Corporate Relationships Forever", desc: "Make a lasting impression on day-one. Premium branded welcome kits with tech gadgets, planners, and luxury packaging that your team will genuinely love.", image: "images/hero_banner.jpg" },
      { id: 's2', active: true, tag: "Electronics & Gadgets", title: "Tech Gifts That Command Attention", desc: "Laser-engrave your logo on slim gold power banks, bamboo wireless chargers, and Bluetooth speakers. Gifts that are used daily — keeping your brand top of mind.", image: "images/tech_gadgets_category.jpg" },
      { id: 's3', active: true, tag: "Drinkware & Flasks", title: "Hydration Gifts They'll Use Every Single Day", desc: "Matte black gold-embossed vacuum flasks, pure copper Ayurvedic sets, and biodegradable coffee husk cups — functional luxury at every sip.", image: "images/drinkware_category.jpg" },
      { id: 's4', active: true, tag: "Planners & Stationery", title: "Premium Stationery for the Modern Executive", desc: "Cork-cover A5 planners with Smyth-sewn flat-lay binding, bamboo gold-accent pens, and solid oak desk organizers. Gifts that reflect serious business culture.", image: "images/eco_gifts_category.jpg" },
      { id: 's5', active: true, tag: "Green Initiatives", title: "Gifts That Show You Care About the Planet", desc: "Seed paper planters, cork diaries, biodegradable cups, and zero-waste kraft boxes. Reinforce your CSR commitment with every thoughtful gift.", image: "images/eco_gifts_category.jpg" },
      { id: 's6', active: true, tag: "Festive Celebrations", title: "Royal Gourmet Hampers for Every Festival", desc: "Gold-foiled Diwali boxes with premium dry fruits, organic forest honey, handmade chocolates, and a traditional brass diya — pure festive delight.", image: "images/diwali_hamper_category.jpg" },
      { id: 's7', active: true, tag: "Executive Office Style", title: "Luxury Leather Accessories, Personalised", desc: "Handcrafted vegan leather laptop sleeves, cardholders, and passport wallets with precision laser-etched corporate logos. Executive gifting elevated.", image: "" },
      { id: 's8', active: true, tag: "Corporate Identity", title: "Branded Apparel That Builds Team Pride", desc: "220 GSM organic cotton polo t-shirts, caps, and winter hoodies with high-density custom embroidery. Wear your brand with pride, every day.", image: "images/products/polo_shirt.jpg" },
      { id: 's9', active: true, tag: "Corporate Recognition", title: "Awards That Inspire Peak Performance", desc: "Reward milestones with high-clarity K9 crystal 3D laser-etched trophies on mahogany wood bases. Recognition that motivates the entire team.", image: "" },
      { id: 's10', active: true, tag: "Household Gifts", title: "Practical Gifts That Last a Lifetime", desc: "Copper kitchenware, premium customized umbrellas, and personalized wall clocks — utility gifts that your clients will display at home with pride.", image: "images/products/copper_set.jpg" }
    ]
  };

  const FALLBACK_INQUIRIES = [
    { id: 'inq_1', date: new Date(Date.now() - 86400000).toISOString(), name: 'Rohan Sharma', email: 'rohan.sharma@tata.com', phone: '+91 98765 43210', company: 'Tata Consultancy Services', qty: 150, timeline: 'flexible', productDetails: 'Custom Built Welcome Box', summary: 'Box: Kraft Sustainable Box (₹90) | Items: Metal Stylus Pen, Organic Cork Diary | Qty: 150', message: 'Need standard embossing of TCS logo. Individual home delivery required.', status: 'pending' },
    { id: 'inq_2', date: new Date().toISOString(), name: 'Anjali Nair', email: 'a.nair@infosys.com', phone: '+91 99988 77766', company: 'Infosys Tech', qty: 40, timeline: 'urgent', productDetails: 'Custom Brand 10,000mAh Power Bank', summary: 'Custom Brand 10,000mAh Power Bank', message: 'Require 40 units for client visit this Friday. Urgent.', status: 'replied' }
  ];

  // Helper: Get token header if logged in
  function getHeaders() {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER));
    return {
      'Content-Type': 'application/json',
      'Authorization': session ? `Bearer ${session.token}` : ''
    };
  }

  /* ============================================================
     MOCK LOCALSTORAGE DATABASE CONTROLLERS
     ============================================================ */
  function getLocalData(key, fallback) {
    const val = localStorage.getItem(key);
    if (!val) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(val);
  }

  function saveLocalData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function addLocalLog(eventText) {
    const logs = getLocalData(STORAGE_KEYS.LOGS, []);
    logs.unshift({ date: new Date().toISOString(), event: eventText });
    if (logs.length > 50) logs.splice(50);
    saveLocalData(STORAGE_KEYS.LOGS, logs);
  }

  /* ============================================================
     EXPORTED API INTERFACE (DYNAMIC DUAL MODE)
     ============================================================ */
  return {
    isServerMode: () => isWebServer,

    resolveImage: (path) => {
      if (!path) return '';
      if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
        return path;
      }
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      // Serve local repository assets (under images/) directly from the local host
      if (cleanPath.startsWith('images/')) {
        return cleanPath;
      }
      return BASE_URL ? `${BASE_URL}/${cleanPath}` : path;
    },

    // Authentication
    login: async (username, password) => {
      if (isWebServer) {
        try {
          const res = await fetch(`${BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          const out = await res.json();
          if (out.success) {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(out));
          }
          return out;
        } catch (err) {
          console.warn("API Login failed, trying fallback to live Cloud Run server:", err);
          const liveUrl = 'https://giftingneeds-backend-748096979929.europe-north1.run.app';
          if (BASE_URL !== liveUrl) {
            try {
              const res = await fetch(`${liveUrl}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
              });
              const out = await res.json();
              if (out.success) {
                localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(out));
              }
              return out;
            } catch (errLive) {
              return { success: false, message: "Network connection failed. Could not connect to local or live server." };
            }
          }
          return { success: false, message: "Network connection failed: " + err.message };
        }
      } else {
        // Local simulation
        const validUsers = [
          { username: "admin", password: "gifting123", role: "admin", label: "Full Administrator" },
          { username: "product_manager", password: "gifting123", role: "product_manager", label: "Product & Inventory Coordinator" },
          { username: "designer", password: "gifting123", role: "designer", label: "UI & Visual Designer" }
        ];
        const match = validUsers.find(u => u.username === username && u.password === password);
        if (match) {
          const session = {
            success: true,
            token: "mock-token-for-" + match.role,
            username: match.username,
            role: match.role,
            label: match.label
          };
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(session));
          addLocalLog(`User "${match.username}" logged in (Simulation Mode).`);
          return session;
        }
        return { success: false, message: "Invalid simulation credentials. Try admin / gifting123" };
      }
    },

    getCurrentUser: () => {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER));
    },

    logout: () => {
      const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER));
      if (user) {
        addLocalLog(`User "${user.username}" logged out.`);
      }
      localStorage.removeItem(STORAGE_KEYS.USER);
    },

    // Products Catalog
    getProducts: async () => {
      if (isWebServer) {
        try {
          const res = await fetch(`${BASE_URL}/api/products`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.json();
        } catch (err) {
          console.warn("API Products fetch failed, falling back to local database:", err);
          const products = getLocalData(STORAGE_KEYS.PRODUCTS, FALLBACK_PRODUCTS);
          return { success: true, products };
        }
      } else {
        const products = getLocalData(STORAGE_KEYS.PRODUCTS, FALLBACK_PRODUCTS);
        return { success: true, products };
      }
    },

    addProduct: async (prod) => {
      if (isWebServer) {
        const res = await fetch(`${BASE_URL}/api/products`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(prod)
        });
        return await res.json();
      } else {
        const list = getLocalData(STORAGE_KEYS.PRODUCTS, FALLBACK_PRODUCTS);
        let maxNum = 0;
        list.forEach(p => {
          const num = parseInt(p.id.replace('p', ''));
          if (!isNaN(num) && num > maxNum) maxNum = num;
        });
        const newProd = {
          id: 'p' + (maxNum + 1),
          category: prod.category,
          categoryLabel: prod.categoryLabel || prod.category.charAt(0).toUpperCase() + prod.category.slice(1),
          badge: prod.badge || '',
          badgeText: prod.badgeText || '',
          title: prod.title,
          price: parseInt(prod.price),
          minQty: parseInt(prod.minQty) || 50,
          icon: prod.icon || '🎁',
          desc: prod.desc || '',
          specs: prod.specs || {}
        };
        list.push(newProd);
        saveLocalData(STORAGE_KEYS.PRODUCTS, list);
        addLocalLog(`Added product "${newProd.title}" (Simulation).`);
        return { success: true, product: newProd };
      }
    },

    updateProduct: async (id, data) => {
      if (isWebServer) {
        const res = await fetch(`${BASE_URL}/api/products/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(data)
        });
        return await res.json();
      } else {
        const list = getLocalData(STORAGE_KEYS.PRODUCTS, FALLBACK_PRODUCTS);
        const idx = list.findIndex(p => p.id === id);
        if (idx === -1) return { success: false, message: 'Product not found' };
        list[idx] = { ...list[idx], ...data, price: parseInt(data.price || list[idx].price), minQty: parseInt(data.minQty || list[idx].minQty) };
        saveLocalData(STORAGE_KEYS.PRODUCTS, list);
        addLocalLog(`Updated product ID: ${id} (Simulation).`);
        return { success: true, product: list[idx] };
      }
    },

    deleteProduct: async (id) => {
      if (isWebServer) {
        const res = await fetch(`${BASE_URL}/api/products/${id}`, {
          method: 'DELETE',
          headers: getHeaders()
        });
        return await res.json();
      } else {
        const list = getLocalData(STORAGE_KEYS.PRODUCTS, FALLBACK_PRODUCTS);
        const idx = list.findIndex(p => p.id === id);
        if (idx === -1) return { success: false, message: 'Product not found' };
        const removed = list.splice(idx, 1)[0];
        saveLocalData(STORAGE_KEYS.PRODUCTS, list);
        addLocalLog(`Deleted product "${removed.title}" (Simulation).`);
        return { success: true };
      }
    },

    bulkUploadProducts: async (products) => {
      if (isWebServer) {
        const res = await fetch(`${BASE_URL}/api/products/bulk`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ products })
        });
        return await res.json();
      } else {
        const list = getLocalData(STORAGE_KEYS.PRODUCTS, FALLBACK_PRODUCTS);
        let added = 0;
        let updated = 0;
        products.forEach(p => {
          if (!p.title || !p.price) return;
          const matchIdx = list.findIndex(dp => dp.title.toLowerCase() === p.title.toLowerCase());
          if (matchIdx > -1) {
            list[matchIdx].price = parseInt(p.price);
            if (p.minQty) list[matchIdx].minQty = parseInt(p.minQty);
            if (p.category) list[matchIdx].category = p.category;
            if (p.desc) list[matchIdx].desc = p.desc;
            updated++;
          } else {
            let maxNum = 0;
            list.forEach(dp => {
              const num = parseInt(dp.id.replace('p', ''));
              if (!isNaN(num) && num > maxNum) maxNum = num;
            });
            list.push({
              id: 'p' + (maxNum + 1),
              category: p.category || 'misc',
              categoryLabel: p.categoryLabel || 'Miscellaneous',
              badge: p.badge || '',
              badgeText: p.badgeText || '',
              title: p.title,
              price: parseInt(p.price),
              minQty: parseInt(p.minQty) || 50,
              icon: p.icon || '🎁',
              desc: p.desc || 'Bulk sheet upload.',
              specs: {}
            });
            added++;
          }
        });
        saveLocalData(STORAGE_KEYS.PRODUCTS, list);
        addLocalLog(`Bulk uploaded ${added} products, updated ${updated} (Simulation).`);
        return { success: true, added, updated };
      }
    },

    // Inquiries
    getInquiries: async () => {
      if (isWebServer) {
        try {
          const res = await fetch(`${BASE_URL}/api/inquiries`, { headers: getHeaders() });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.json();
        } catch (err) {
          console.warn("API Inquiries fetch failed, falling back to local database:", err);
          const inquiries = getLocalData(STORAGE_KEYS.INQUIRIES, FALLBACK_INQUIRIES);
          return { success: true, inquiries };
        }
      } else {
        const inquiries = getLocalData(STORAGE_KEYS.INQUIRIES, FALLBACK_INQUIRIES);
        return { success: true, inquiries };
      }
    },

    createInquiry: async (inq) => {
      if (isWebServer) {
        const res = await fetch(`${BASE_URL}/api/inquiries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inq)
        });
        return await res.json();
      } else {
        const list = getLocalData(STORAGE_KEYS.INQUIRIES, FALLBACK_INQUIRIES);
        const newId = 'inq_' + Date.now();
        const item = {
          id: newId,
          date: new Date().toISOString(),
          name: inq.name,
          email: inq.email,
          phone: inq.phone,
          company: inq.company || 'Not specified',
          qty: parseInt(inq.qty),
          timeline: inq.timeline || 'flexible',
          productDetails: inq.productDetails || 'General Inquiry',
          summary: inq.summary || '',
          message: inq.message || '',
          status: 'pending'
        };
        list.unshift(item);
        saveLocalData(STORAGE_KEYS.INQUIRIES, list);
        addLocalLog(`New lead inquiry from "${inq.name}" (Simulation).`);
        return { success: true, inquiryId: newId };
      }
    },

    updateInquiryStatus: async (id, status) => {
      if (isWebServer) {
        const res = await fetch(`${BASE_URL}/api/inquiries/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ status })
        });
        return await res.json();
      } else {
        const list = getLocalData(STORAGE_KEYS.INQUIRIES, FALLBACK_INQUIRIES);
        const idx = list.findIndex(i => i.id === id);
        if (idx === -1) return { success: false, message: 'Inquiry not found' };
        list[idx].status = status;
        saveLocalData(STORAGE_KEYS.INQUIRIES, list);
        addLocalLog(`Updated Inquiry ID: ${id} status to "${status}" (Simulation).`);
        return { success: true, inquiry: list[idx] };
      }
    },

    // Design Settings
    getDesignSettings: async () => {
      if (isWebServer) {
        try {
          const res = await fetch(`${BASE_URL}/api/settings/design`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.json();
        } catch (err) {
          console.warn("API Design Settings fetch failed, falling back to local defaults:", err);
          const design = getLocalData(STORAGE_KEYS.DESIGN, DEFAULT_DESIGN);
          return { success: true, design };
        }
      } else {
        const design = getLocalData(STORAGE_KEYS.DESIGN, DEFAULT_DESIGN);
        return { success: true, design };
      }
    },

    saveDesignSettings: async (settings) => {
      if (isWebServer) {
        const res = await fetch(`${BASE_URL}/api/settings/design`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(settings)
        });
        return await res.json();
      } else {
        const design = getLocalData(STORAGE_KEYS.DESIGN, DEFAULT_DESIGN);
        const updated = {
          ...design,
          ...settings,
          colors: { ...design.colors, ...(settings.colors || {}) },
          fonts: { ...design.fonts, ...(settings.fonts || {}) }
        };
        saveLocalData(STORAGE_KEYS.DESIGN, updated);
        addLocalLog(`Visual style overrides updated (Simulation).`);
        return { success: true, design: updated };
      }
    },

    uploadImage: async (filename, base64) => {
      if (isWebServer) {
        const res = await fetch(`${BASE_URL}/api/upload`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ filename, base64 })
        });
        return await res.json();
      } else {
        addLocalLog(`Simulated image upload for "${filename}".`);
        return { success: true, url: base64 };
      }
    },

    // AI Bot Chat Automation
    talkToAIBot: async (message) => {
      if (isWebServer) {
        const res = await fetch(`${BASE_URL}/api/ai/automate`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ message })
        });
        return await res.json();
      } else {
        // client-side mock bot processing matching basic instructions
        const prompt = message.toLowerCase().trim();
        const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER)) || { username: 'designer' };
        let reply = "";
        let actionTaken = false;

        if ((prompt.includes('increase') || prompt.includes('raise')) && prompt.includes('%')) {
          const match = prompt.match(/(\d+)%/);
          if (match) {
            const pct = parseInt(match[1]);
            const list = getLocalData(STORAGE_KEYS.PRODUCTS, FALLBACK_PRODUCTS);
            list.forEach(p => p.price = Math.round(p.price * (1 + pct / 100)));
            saveLocalData(STORAGE_KEYS.PRODUCTS, list);
            actionTaken = true;
            reply = `🤖 AI Automation (Local DB): Increased prices of all ${list.length} items by **${pct}%** successfully.`;
            addLocalLog(`AI Bot Action: Increased prices by ${pct}% (Simulation).`);
          }
        } else if (prompt.includes('discount') || prompt.includes('decrease')) {
          const match = prompt.match(/(\d+)/);
          if (match) {
            const amt = parseInt(match[1]);
            const list = getLocalData(STORAGE_KEYS.PRODUCTS, FALLBACK_PRODUCTS);
            list.forEach(p => p.price = Math.max(10, p.price - amt));
            saveLocalData(STORAGE_KEYS.PRODUCTS, list);
            actionTaken = true;
            reply = `🤖 AI Automation (Local DB): Applied flat **₹${amt}** discount to all ${list.length} products.`;
            addLocalLog(`AI Bot Action: Applied ₹${amt} discount (Simulation).`);
          }
        } else if (prompt.includes('change footer address to') || prompt.includes('set footer address to')) {
          const idx = prompt.indexOf(' to ');
          if (idx > -1) {
            const val = message.substring(idx + 4).trim();
            if (val) {
              const design = getLocalData(STORAGE_KEYS.DESIGN, DEFAULT_DESIGN);
              if (!design.footer) design.footer = { contactInfo: {} };
              if (!design.footer.contactInfo) design.footer.contactInfo = {};
              design.footer.contactInfo.address = val;
              saveLocalData(STORAGE_KEYS.DESIGN, design);
              actionTaken = true;
              reply = `🤖 AI Automation (Local DB): I have updated the corporate office address in the footer to **"${val}"** successfully.`;
              addLocalLog(`AI Bot Action: Updated footer address coordinates (Simulation).`);
            }
          }
        } else if (prompt.includes('change helpline phone to') || prompt.includes('change helpline to') || prompt.includes('set helpline phone to') || prompt.includes('set helpline to')) {
          const idx = prompt.indexOf(' to ');
          if (idx > -1) {
            const val = message.substring(idx + 4).trim();
            if (val) {
              const design = getLocalData(STORAGE_KEYS.DESIGN, DEFAULT_DESIGN);
              if (!design.footer) design.footer = { contactInfo: {} };
              if (!design.footer.contactInfo) design.footer.contactInfo = {};
              design.footer.contactInfo.phone = val;
              saveLocalData(STORAGE_KEYS.DESIGN, design);
              actionTaken = true;
              reply = `🤖 AI Automation (Local DB): I have updated the bulk helpline phone number in the footer to **"${val}"** successfully.`;
              addLocalLog(`AI Bot Action: Updated footer helpline phone (Simulation).`);
            }
          }
        } else if ((prompt.includes('add navigation link') || prompt.includes('add navbar link') || prompt.includes('add link')) && (prompt.includes('with link') || prompt.includes('with url') || prompt.includes('with href'))) {
          const nameMatch = message.match(/(?:add navigation link|add navbar link|add link)\s+(?:named\s+)?([A-Za-z0-9\s]+)\s+with\s+(?:link|href|url)\s+(\S+)/i);
          if (nameMatch) {
            const label = nameMatch[1].trim();
            const href = nameMatch[2].trim();
            if (label && href) {
              const design = getLocalData(STORAGE_KEYS.DESIGN, DEFAULT_DESIGN);
              if (!design.navigation) design.navigation = [];
              design.navigation.push({ label, href });
              saveLocalData(STORAGE_KEYS.DESIGN, design);
              actionTaken = true;
              reply = `🤖 AI Automation (Local DB): I have added a new navigation link **"${label}"** pointing to **"${href}"** in the main header menu.`;
              addLocalLog(`AI Bot Action: Added menu link "${label}" (${href}) via chat (Simulation).`);
            }
          } else {
            const parts = prompt.split('with link');
            if (parts.length > 1) {
              const label = parts[0].replace('add navigation link', '').replace('add navbar link', '').replace('named', '').trim();
              const href = parts[1].trim();
              if (label && href) {
                const formattedLabel = label.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                const design = getLocalData(STORAGE_KEYS.DESIGN, DEFAULT_DESIGN);
                if (!design.navigation) design.navigation = [];
                design.navigation.push({ label: formattedLabel, href });
                saveLocalData(STORAGE_KEYS.DESIGN, design);
                actionTaken = true;
                reply = `🤖 AI Automation (Local DB): I have added a new navigation link **"${formattedLabel}"** pointing to **"${href}"** in the main header menu.`;
                addLocalLog(`AI Bot Action: Added menu link "${formattedLabel}" (${href}) via chat (Simulation).`);
              }
            }
          }
        } else if (prompt.includes('set primary color') || prompt.includes('change primary color')) {
          const hexMatch = prompt.match(/#([a-f0-9]{6}|[a-f0-9]{3})/);
          if (hexMatch) {
            const hex = hexMatch[0].toUpperCase();
            const design = getLocalData(STORAGE_KEYS.DESIGN, DEFAULT_DESIGN);
            design.colors.primary = hex;
            saveLocalData(STORAGE_KEYS.DESIGN, design);
            actionTaken = true;
            reply = `🤖 AI Automation (Local DB): Updated primary design color theme variable to **${hex}**. Refresh page to preview.`;
            addLocalLog(`AI Bot Action: Primary color changed to ${hex} (Simulation).`);
          }
        } else if (prompt.includes('stat') || prompt.includes('summary')) {
          const prodCount = getLocalData(STORAGE_KEYS.PRODUCTS, FALLBACK_PRODUCTS).length;
          const inqCount = getLocalData(STORAGE_KEYS.INQUIRIES, FALLBACK_INQUIRIES).length;
          reply = `🤖 AI Summary (Local DB Mode):\n\n*   **Products:** ${prodCount} listed.\n*   **Leads:** ${inqCount} inquiries recorded.`;
        }

        if (!reply) {
          reply = `🤖 Hello ${user.username}! I am running in local simulation mode.
          
You can try these actions:
*   *"Increase prices of all products by 12%"*
*   *"Discount products by 30 rupees"*
*   *"Set primary color to #D4AF37"*
*   *"Show statistics"*`;
        }
        return { success: true, reply, actionTaken };
      }
    },

    // System event logs
    getLogs: async () => {
      if (isWebServer) {
        try {
          const res = await fetch(`${BASE_URL}/api/logs`, { headers: getHeaders() });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.json();
        } catch (err) {
          console.warn("API Logs fetch failed, falling back to local database:", err);
          const logs = getLocalData(STORAGE_KEYS.LOGS, [
            { date: new Date().toISOString(), event: "Client session established in localStorage database mode." }
          ]);
          return { success: true, logs };
        }
      } else {
        const logs = getLocalData(STORAGE_KEYS.LOGS, [
          { date: new Date().toISOString(), event: "Client session established in localStorage database mode." }
        ]);
        return { success: true, logs };
      }
    }
  };
})();

// Inject design settings on client load
(async function applyDesignSystemOnLoad() {
  try {
    const res = await GiftingAPI.getDesignSettings();
    if (res.success && res.design && res.design.colors) {
      const colors = res.design.colors;
      const root = document.documentElement;
      
      // Inject theme variables dynamically into CSS
      root.style.setProperty('--primary', colors.primary);
      if (colors.primaryLight) root.style.setProperty('--primary-light', colors.primaryLight);
      if (colors.primaryGlow) root.style.setProperty('--primary-glow', colors.primaryGlow);
      if (colors.gold) root.style.setProperty('--gold', colors.gold);
      if (colors.goldBright) root.style.setProperty('--gold-bright', colors.goldBright);
      if (colors.goldGlow) root.style.setProperty('--gold-glow', colors.goldGlow);
      if (colors.crimson) root.style.setProperty('--crimson', colors.crimson);
      
      // Inject fonts dynamically
      if (res.design.fonts) {
        if (res.design.fonts.headings) root.style.setProperty('--font-headings', res.design.fonts.headings);
        if (res.design.fonts.body) root.style.setProperty('--font-body', res.design.fonts.body);
      }
    }
  } catch (err) {
    console.warn("Design parameters could not be applied automatically:", err);
  }
})();
