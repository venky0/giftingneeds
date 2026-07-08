const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Serve static assets from public folders
app.use(express.static(__dirname));

// Utility to verify token / role permission
function authorize(req, res, allowedRoles) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return null;
  }
  const token = authHeader.replace('Bearer ', '');
  const data = db.read();
  
  // Find matching user for mock token
  const user = data.users.find(u => "mock-token-for-" + u.role === token);
  if (!user) {
    res.status(401).json({ success: false, message: "Invalid session token" });
    return null;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    res.status(430).json({ success: false, message: "Permission denied for this operation" });
    return null;
  }
  return user;
}

/* ============================================================
   1. USER AUTH API
   ============================================================ */
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Missing username or password" });
  }

  const data = db.read();
  const user = data.users.find(u => u.username === username && u.password === password);
  
  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  // Generate secure mock token based on user role
  const token = "mock-token-for-" + user.role;
  db.addLog(`User "${user.username}" (${user.role}) logged in successfully.`);
  
  res.json({
    success: true,
    token,
    username: user.username,
    role: user.role,
    label: user.label
  });
});

/* ============================================================
   2. PRODUCTS CRUD API (Requires Admin or Product Manager)
   ============================================================ */
app.get('/api/products', (req, res) => {
  const data = db.read();
  res.json({ success: true, products: data.products });
});

app.post('/api/products', (req, res) => {
  const user = authorize(req, res, ['admin', 'product_manager']);
  if (!user) return;

  const productData = req.body;
  if (!productData.title || !productData.category || !productData.price) {
    return res.status(400).json({ success: false, message: "Title, category, and price are required." });
  }

  const data = db.read();
  // Find highest current ID number to generate next one
  let maxNum = 0;
  data.products.forEach(p => {
    const num = parseInt(p.id.replace('p', ''));
    if (!isNaN(num) && num > maxNum) maxNum = num;
  });
  const newId = 'p' + (maxNum + 1);

  const newProduct = {
    id: newId,
    category: productData.category,
    categoryLabel: productData.categoryLabel || productData.category.charAt(0).toUpperCase() + productData.category.slice(1),
    badge: productData.badge || '',
    badgeText: productData.badgeText || '',
    title: productData.title,
    price: parseInt(productData.price),
    minQty: parseInt(productData.minQty) || 50,
    icon: productData.icon || '🎁',
    desc: productData.desc || 'No description provided.',
    specs: productData.specs || {}
  };

  data.products.push(newProduct);
  db.write(data);
  db.addLog(`Product "${newProduct.title}" (ID: ${newId}) created by ${user.username}.`);

  res.status(201).json({ success: true, product: newProduct });
});

app.put('/api/products/:id', (req, res) => {
  const user = authorize(req, res, ['admin', 'product_manager']);
  if (!user) return;

  const { id } = req.params;
  const updateData = req.body;

  const data = db.read();
  const productIndex = data.products.findIndex(p => p.id === id);

  if (productIndex === -1) {
    return res.status(404).json({ success: false, message: "Product not found." });
  }

  const updatedProduct = {
    ...data.products[productIndex],
    ...updateData,
    price: updateData.price !== undefined ? parseInt(updateData.price) : data.products[productIndex].price,
    minQty: updateData.minQty !== undefined ? parseInt(updateData.minQty) : data.products[productIndex].minQty
  };

  data.products[productIndex] = updatedProduct;
  db.write(data);
  db.addLog(`Product "${updatedProduct.title}" (ID: ${id}) updated by ${user.username}.`);

  res.json({ success: true, product: updatedProduct });
});

app.delete('/api/products/:id', (req, res) => {
  const user = authorize(req, res, ['admin', 'product_manager']);
  if (!user) return;

  const { id } = req.params;

  const data = db.read();
  const productIndex = data.products.findIndex(p => p.id === id);

  if (productIndex === -1) {
    return res.status(404).json({ success: false, message: "Product not found." });
  }

  const deletedProduct = data.products.splice(productIndex, 1)[0];
  db.write(data);
  db.addLog(`Product "${deletedProduct.title}" (ID: ${id}) deleted by ${user.username}.`);

  res.json({ success: true, message: "Product deleted successfully." });
});

// 2b. BULK INGESTION SHEET API
app.post('/api/products/bulk', (req, res) => {
  const user = authorize(req, res, ['admin', 'product_manager']);
  if (!user) return;

  const { products } = req.body;
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ success: false, message: "Invalid bulk products list." });
  }

  const data = db.read();
  let addedCount = 0;
  let updatedCount = 0;

  products.forEach(p => {
    if (!p.title || !p.price) return; // Skip invalid rows
    
    // Check if product already exists by exact title match (case insensitive)
    const existingIndex = data.products.findIndex(dp => dp.title.toLowerCase() === p.title.toLowerCase());
    
    if (existingIndex > -1) {
      // Update price and details
      data.products[existingIndex].price = parseInt(p.price);
      if (p.minQty) data.products[existingIndex].minQty = parseInt(p.minQty);
      if (p.category) {
        data.products[existingIndex].category = p.category;
        data.products[existingIndex].categoryLabel = p.categoryLabel || p.category.charAt(0).toUpperCase() + p.category.slice(1);
      }
      if (p.icon) data.products[existingIndex].icon = p.icon;
      if (p.desc) data.products[existingIndex].desc = p.desc;
      updatedCount++;
    } else {
      // Generate ID
      let maxNum = 0;
      data.products.forEach(dp => {
        const num = parseInt(dp.id.replace('p', ''));
        if (!isNaN(num) && num > maxNum) maxNum = num;
      });
      const newId = 'p' + (maxNum + 1);

      data.products.push({
        id: newId,
        category: p.category || 'misc',
        categoryLabel: p.categoryLabel || 'Miscellaneous',
        badge: p.badge || '',
        badgeText: p.badgeText || '',
        title: p.title,
        price: parseInt(p.price),
        minQty: parseInt(p.minQty) || 50,
        icon: p.icon || '🎁',
        desc: p.desc || 'Bulk uploaded product.',
        specs: p.specs || {}
      });
      addedCount++;
    }
  });

  db.write(data);
  db.addLog(`Bulk product ingestion executed by ${user.username}: added ${addedCount}, updated ${updatedCount} items.`);
  res.json({ success: true, added: addedCount, updated: updatedCount });
});

/* ============================================================
   3. CUSTOMER INQUIRIES API (Public submit, Auth read/manage)
   ============================================================ */
app.get('/api/inquiries', (req, res) => {
  const user = authorize(req, res, ['admin']);
  if (!user) return;

  const data = db.read();
  res.json({ success: true, inquiries: data.inquiries });
});

app.post('/api/inquiries', (req, res) => {
  // Public endpoint
  const inquiryData = req.body;
  if (!inquiryData.name || !inquiryData.email || !inquiryData.phone || !inquiryData.qty) {
    return res.status(400).json({ success: false, message: "Missing required inquiry fields." });
  }

  const data = db.read();
  const nextId = 'inq_' + Date.now();

  const newInquiry = {
    id: nextId,
    date: new Date().toISOString(),
    name: inquiryData.name,
    email: inquiryData.email,
    phone: inquiryData.phone,
    company: inquiryData.company || 'Not specified',
    qty: parseInt(inquiryData.qty),
    timeline: inquiryData.timeline || 'flexible',
    productDetails: inquiryData.productDetails || 'General Inquiry',
    summary: inquiryData.summary || '',
    message: inquiryData.message || '',
    status: 'pending'
  };

  data.inquiries.unshift(newInquiry);
  db.write(data);
  db.addLog(`New lead inquiry submitted by "${newInquiry.name}" from "${newInquiry.company}".`);

  res.status(201).json({ success: true, inquiryId: nextId });
});

app.put('/api/inquiries/:id', (req, res) => {
  const user = authorize(req, res, ['admin']);
  if (!user) return;

  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: "Status is required." });
  }

  const data = db.read();
  const index = data.inquiries.findIndex(i => i.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: "Inquiry not found." });
  }

  data.inquiries[index].status = status;
  db.write(data);
  db.addLog(`Inquiry ID: ${id} status changed to "${status}" by ${user.username}.`);

  res.json({ success: true, inquiry: data.inquiries[index] });
});

/* ============================================================
   4. DESIGN & VISUAL THEMING SETTINGS API (Requires Admin or Designer)
   ============================================================ */
app.get('/api/settings/design', (req, res) => {
  const data = db.read();
  res.json({ success: true, design: data.design });
});

app.post('/api/settings/design', (req, res) => {
  const user = authorize(req, res, ['admin', 'designer']);
  if (!user) return;

  const newDesignSettings = req.body;
  const data = db.read();

  data.design = {
    ...data.design,
    ...newDesignSettings,
    colors: {
      ...data.design.colors,
      ...(newDesignSettings.colors || {})
    },
    fonts: {
      ...data.design.fonts,
      ...(newDesignSettings.fonts || {})
    }
  };

  db.write(data);
  db.addLog(`Visual design override parameters updated by ${user.username}.`);

  res.json({ success: true, design: data.design });
});

/* ============================================================
   4b. FILE UPLOADS API (Admins, Product Coordinators, Designers)
   ============================================================ */
app.post('/api/upload', (req, res) => {
  const user = authorize(req, res, ['admin', 'product_manager', 'designer']);
  if (!user) return;

  const { filename, base64 } = req.body;
  if (!filename || !base64) {
    return res.status(400).json({ success: false, message: "Missing filename or base64 data" });
  }

  const fs = require('fs');
  // Sanitize filename: remove path traversal characters and non-safe symbols
  let cleanFilename = path.basename(filename).replace(/[^a-zA-Z0-9.-]/g, '_');
  
  // Enforce image extensions
  const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
  const ext = path.extname(cleanFilename).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return res.status(400).json({ success: false, message: "Invalid file type. Only standard images are allowed." });
  }

  // Create unique name
  const timestamp = Date.now();
  const nameWithoutExt = path.basename(cleanFilename, ext);
  const finalFilename = `${nameWithoutExt}_${timestamp}${ext}`;

  // Ensure uploads directory exists
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const finalPath = path.join(uploadsDir, finalFilename);

  // Strip base64 prefix
  let base64Data = base64;
  if (base64.includes(';base64,')) {
    base64Data = base64.split(';base64,').pop();
  }

  try {
    fs.writeFileSync(finalPath, Buffer.from(base64Data, 'base64'));
    const url = `uploads/${finalFilename}`;
    db.addLog(`File uploaded: "${url}" by ${user.username}.`);
    res.json({ success: true, url });
  } catch (err) {
    console.error("File upload error:", err);
    res.status(500).json({ success: false, message: "Failed to write file to disk." });
  }
});

/* ============================================================
   5. AI AUTOMATION CHAT BOT API
   ============================================================ */
app.post('/api/ai/automate', (req, res) => {
  const user = authorize(req, res, ['admin', 'product_manager', 'designer']);
  if (!user) return;

  const { message } = req.body;
  if (!message || message.trim() === '') {
    return res.status(400).json({ success: false, message: "Empty bot query." });
  }

  const prompt = message.toLowerCase().trim();
  const data = db.read();
  let responseText = "";
  let actionTaken = false;

  // Simple parsing engine matching key actions requested by client
  try {
    // Command 1: Increase prices (e.g., "increase prices of tech by 10%" or "raise tech prices 10%")
    if ((prompt.includes('increase') || prompt.includes('raise')) && prompt.includes('%')) {
      const matchPercent = prompt.match(/(\d+)%/);
      if (matchPercent) {
        const percent = parseInt(matchPercent[1]);
        let category = null;
        
        if (prompt.includes('tech')) category = 'tech';
        else if (prompt.includes('drinkware') || prompt.includes('mug') || prompt.includes('flask')) category = 'drinkware';
        else if (prompt.includes('stationery') || prompt.includes('diary')) category = 'stationery';
        else if (prompt.includes('apparel') || prompt.includes('shirt')) category = 'apparel';
        else if (prompt.includes('hamper')) category = 'hampers';
        else if (prompt.includes('trophies') || prompt.includes('award')) category = 'trophies';
        
        let count = 0;
        data.products.forEach(p => {
          if (!category || p.category === category) {
            p.price = Math.round(p.price * (1 + percent / 100));
            count++;
          }
        });
        
        if (count > 0) {
          db.write(data);
          actionTaken = true;
          const target = category ? `in the "${category}" category` : 'globally';
          responseText = `🤖 AI Automation: I have increased the bulk prices of all ${count} products ${target} by **${percent}%** successfully.`;
          db.addLog(`AI Bot Action: Increased prices of ${count} products (${category || 'all'}) by ${percent}%. Request by ${user.username}.`);
        } else {
          responseText = `🤖 AI Assistant: I couldn't find any products matching that category to adjust.`;
        }
      }
    }
    // Command 2: Discount prices (e.g., "discount all diaries by 50 rupees")
    else if (prompt.includes('discount') || prompt.includes('decrease') || prompt.includes('lower')) {
      const matchAmount = prompt.match(/(?:by\s+)?(?:rs\.?|₹\s*)?(\d+)\s*(?:rupees|rs)?/);
      if (matchAmount) {
        const amount = parseInt(matchAmount[1]);
        let category = null;
        
        if (prompt.includes('tech')) category = 'tech';
        else if (prompt.includes('drinkware') || prompt.includes('mug') || prompt.includes('flask')) category = 'drinkware';
        else if (prompt.includes('stationery') || prompt.includes('diary') || prompt.includes('planner')) category = 'stationery';
        else if (prompt.includes('apparel') || prompt.includes('shirt') || prompt.includes('clothing')) category = 'apparel';
        else if (prompt.includes('hamper') || prompt.includes('gift box')) category = 'hampers';
        
        let count = 0;
        data.products.forEach(p => {
          if (!category || p.category === category) {
            p.price = Math.max(10, p.price - amount); // keep min price 10
            count++;
          }
        });
        
        if (count > 0) {
          db.write(data);
          actionTaken = true;
          const target = category ? `in the "${category}" category` : 'globally';
          responseText = `🤖 AI Automation: Applied a flat **₹${amount}** discount to all ${count} products ${target} successfully.`;
          db.addLog(`AI Bot Action: Lowered prices of ${count} products (${category || 'all'}) by ₹${amount}. Request by ${user.username}.`);
        } else {
          responseText = `🤖 AI Assistant: I couldn't find any products in that category to discount.`;
        }
      }
    }
    // Command 3: Add single product via voice prompt (e.g., "add product royal silk tie with price 299 under category apparel")
    else if (prompt.includes('add product') || prompt.includes('create product')) {
      const parts = prompt.split('price');
      if (parts.length > 1) {
        const namePart = parts[0].replace('add product', '').replace('create product', '').replace('named', '').trim();
        const priceAndCategoryPart = parts[1];
        
        const priceMatch = priceAndCategoryPart.match(/(\d+)/);
        let category = 'misc';
        
        if (priceAndCategoryPart.includes('tech')) category = 'tech';
        else if (priceAndCategoryPart.includes('drinkware')) category = 'drinkware';
        else if (priceAndCategoryPart.includes('stationery')) category = 'stationery';
        else if (priceAndCategoryPart.includes('apparel')) category = 'apparel';
        else if (priceAndCategoryPart.includes('hamper')) category = 'hampers';
        else if (priceAndCategoryPart.includes('trophies')) category = 'trophies';

        if (namePart && priceMatch) {
          const price = parseInt(priceMatch[1]);
          const title = namePart.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          
          let maxNum = 0;
          data.products.forEach(p => {
            const num = parseInt(p.id.replace('p', ''));
            if (!isNaN(num) && num > maxNum) maxNum = num;
          });
          const newId = 'p' + (maxNum + 1);
          
          const categoryLabels = {
            tech: 'Electronics & Tech',
            drinkware: 'Premium Drinkware',
            stationery: 'Desk Utilities & Planners',
            apparel: 'Apparel & Bags',
            hampers: 'Festive & Gourmet Hampers',
            trophies: 'Trophies & Mementos',
            misc: 'Miscellaneous'
          };

          const newProduct = {
            id: newId,
            category,
            categoryLabel: categoryLabels[category],
            badge: 'new',
            badgeText: 'Added by Bot',
            title,
            price,
            minQty: 50,
            icon: category === 'tech' ? '🔌' : category === 'drinkware' ? '☕' : category === 'apparel' ? '👕' : '🎁',
            desc: 'Automated insertion via AI chat command helper.',
            specs: { 'Origin': 'AI Automation Ingestion' }
          };

            data.products.push(newProduct);
            db.write(data);
            actionTaken = true;
            responseText = `🤖 AI Automation: I have created the new product **"${title}"** (ID: ${newId}) priced at **₹${price}** in the **${categoryLabels[category]}** catalog.`;
            db.addLog(`AI Bot Action: Created product "${title}" via chat command. Request by ${user.username}.`);
          }
        }
      }
    // Command 3b: Change footer address
    else if (prompt.includes('change footer address to') || prompt.includes('set footer address to')) {
      const idx = prompt.indexOf(' to ');
      if (idx > -1) {
        const val = message.substring(idx + 4).trim();
        if (val) {
          data.design.footer.contactInfo.address = val;
          db.write(data);
          actionTaken = true;
          responseText = `🤖 AI Automation: I have updated the corporate office address in the footer to **"${val}"** successfully.`;
          db.addLog(`AI Bot Action: Updated footer address coordinates. Request by ${user.username}.`);
        }
      }
    }
    // Command 3c: Change helpline phone number
    else if (prompt.includes('change helpline phone to') || prompt.includes('change helpline to') || prompt.includes('set helpline phone to') || prompt.includes('set helpline to')) {
      const idx = prompt.indexOf(' to ');
      if (idx > -1) {
        const val = message.substring(idx + 4).trim();
        if (val) {
          data.design.footer.contactInfo.phone = val;
          db.write(data);
          actionTaken = true;
          responseText = `🤖 AI Automation: I have updated the bulk inquiry helpline phone to **"${val}"** successfully.`;
          db.addLog(`AI Bot Action: Updated footer helpline phone. Request by ${user.username}.`);
        }
      }
    }
    // Command 3d: Add navigation link
    else if ((prompt.includes('add navigation link') || prompt.includes('add navbar link') || prompt.includes('add link')) && (prompt.includes('with link') || prompt.includes('with url') || prompt.includes('with href'))) {
      const nameMatch = message.match(/(?:add navigation link|add navbar link|add link)\s+(?:named\s+)?([A-Za-z0-9\s]+)\s+with\s+(?:link|href|url)\s+(\S+)/i);
      if (nameMatch) {
        const label = nameMatch[1].trim();
        const href = nameMatch[2].trim();
        if (label && href) {
          data.design.navigation.push({ label, href });
          db.write(data);
          actionTaken = true;
          responseText = `🤖 AI Automation: I have added a new navigation link **"${label}"** pointing to **"${href}"** in the main header menu.`;
          db.addLog(`AI Bot Action: Added menu link "${label}" (${href}) via chat. Request by ${user.username}.`);
        }
      } else {
        const parts = prompt.split('with link');
        if (parts.length > 1) {
          const label = parts[0].replace('add navigation link', '').replace('add navbar link', '').replace('named', '').trim();
          const href = parts[1].trim();
          if (label && href) {
            const formattedLabel = label.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            data.design.navigation.push({ label: formattedLabel, href });
            db.write(data);
            actionTaken = true;
            responseText = `🤖 AI Automation: I have added a new navigation link **"${formattedLabel}"** pointing to **"${href}"** in the main header menu.`;
            db.addLog(`AI Bot Action: Added menu link "${formattedLabel}" (${href}) via chat. Request by ${user.username}.`);
          }
        }
      }
    }
    // Command 4: Set site primary theme colors (Designer/Admin only)
    else if (prompt.includes('set primary color') || prompt.includes('change primary color')) {
      if (!['admin', 'designer'].includes(user.role)) {
        return res.status(403).json({ success: false, message: "Only Administrators or Designers can change theme colors." });
      }
      const hexMatch = prompt.match(/#([a-f0-9]{6}|[a-f0-9]{3})/);
      if (hexMatch) {
        const hex = hexMatch[0].toUpperCase();
        data.design.colors.primary = hex;
        db.write(data);
        actionTaken = true;
        responseText = `🤖 AI Automation: I have changed the website primary theme color code to **${hex}** successfully.`;
        db.addLog(`AI Bot Action: Adjusted visual theme primary color to ${hex}. Request by ${user.username}.`);
      } else {
        responseText = `🤖 AI Assistant: Please provide a valid hex color code (e.g., #0B5C44).`;
      }
    }
    // Command 5: Show dynamic stats (e.g. "show statistics" or "summarize database")
    else if (prompt.includes('stat') || prompt.includes('summary') || prompt.includes('count')) {
      const prodCount = data.products.length;
      const inqCount = data.inquiries.length;
      const pendingInq = data.inquiries.filter(i => i.status === 'pending').length;
      responseText = `🤖 AI Summary Dashboard:\n\n*   **Products Catalog:** ${prodCount} active items.\n*   **Total Leads:** ${inqCount} inquiries recorded.\n*   **Awaiting Action:** ${pendingInq} pending corporate quote requests.\n*   **Server State:** Operational and stable.`;
    }
    
    // Default reply if no specific command regex was triggered
    if (!responseText) {
      responseText = `🤖 Hello ${user.username}! I am your Gifting Needs Automation Bot. 

I can help execute quick shortcuts using natural text:
*   *"Increase prices of tech by 10%"*
*   *"Discount all stationery by 40 rupees"*
*   *"Add product Premium Mug with price 350 under category drinkware"*
*   *"Set primary color to #1A365D"* (Admins/Designers only)
*   *"Show statistics"*`;
    }

    res.json({ success: true, reply: responseText, actionTaken });
  } catch (err) {
    res.status(500).json({ success: false, message: "AI Engine Processing Error", details: err.message });
  }
});

// Logs Endpoint (Admins only)
app.get('/api/logs', (req, res) => {
  const user = authorize(req, res, ['admin']);
  if (!user) return;

  const data = db.read();
  res.json({ success: true, logs: data.logs });
});

/* ============================================================
   START SERVER WITH PORT FALLBACK
   ============================================================ */
const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
let port = DEFAULT_PORT;

function startServer(p) {
  const server = app.listen(p, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Gifting Needs backend is running on port ${p}`);
    console.log(`👉 Access website at: http://localhost:${p}`);
    console.log(`👉 Access dashboard at: http://localhost:${p}/admin.html`);
    console.log(`=======================================================`);
    
    // Write log that server started
    db.addLog(`Express Backend started successfully on port ${p}.`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${p} is currently in use. Falling back to port ${p + 1}...`);
      startServer(p + 1);
    } else {
      console.error("Server startup error:", err);
    }
  });
}

startServer(port);
