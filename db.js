const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

// Default initial database state containing 100% dynamic UI text configurations
const DEFAULT_STATE = {
  "users": [
    {
      "username": "admin",
      "password": "gifting123",
      "role": "admin",
      "label": "Full Administrator"
    },
    {
      "username": "product_manager",
      "password": "gifting123",
      "role": "product_manager",
      "label": "Product & Inventory Coordinator"
    },
    {
      "username": "designer",
      "password": "gifting123",
      "role": "designer",
      "label": "UI & Visual Designer"
    }
  ],
  "products": [
    {
      "id": "p1",
      "category": "tech",
      "categoryLabel": "Smart Gadgets & Tech",
      "badge": "popular",
      "badgeText": "Bestseller",
      "title": "Custom Brand 10,000mAh Power Bank",
      "price": 649,
      "minQty": 50,
      "icon": "\ud83d\udd0b",
      "desc": "Ultra-slim metallic power bank featuring smart dual USB ports and laser engraved branding. High retention appreciation gift.",
      "specs": {
        "Capacity": "10000mAh",
        "Ports": "Dual USB + Type-C",
        "Branding": "Laser Engraving / Screen Print"
      },
      "image": "images/power_bank.png"
    },
    {
      "id": "p2",
      "category": "tech",
      "categoryLabel": "Smart Gadgets & Tech",
      "badge": "new",
      "badgeText": "Eco Tech",
      "title": "Executive Bamboo Wireless Charging Pad",
      "price": 499,
      "minQty": 100,
      "icon": "\ud83d\udd0c",
      "desc": "Eco-conscious bamboo wireless charger. Supports 15W fast charging for smartphones. Includes custom logo engraving.",
      "specs": {
        "Material": "Natural Bamboo",
        "Output": "15W Fast Charge",
        "Branding": "Engraved Logo"
      },
      "image": "images/bluetooth_speakers.png"
    },
    {
      "id": "p3",
      "category": "tech",
      "categoryLabel": "Smart Gadgets & Tech",
      "badge": "",
      "badgeText": "",
      "title": "Metal Ring Bluetooth Speaker & Mic",
      "price": 899,
      "minQty": 50,
      "icon": "\ud83d\udd0a",
      "desc": "High-fidelity metal-body Bluetooth speaker with clear vocal mic support. Compact and premium desk ornament.",
      "specs": {
        "Body": "Premium Aluminium",
        "Output": "5W Deep Bass",
        "Battery": "Up to 6 Hours"
      },
      "image": "images/bluetooth_speakers.png"
    },
    {
      "id": "p4",
      "category": "tech",
      "categoryLabel": "Smart Gadgets & Tech",
      "badge": "popular",
      "badgeText": "Smart Desk",
      "title": "Smart Power Bank Executive Organizer Planner",
      "price": 1499,
      "minQty": 30,
      "icon": "\ud83d\udcd4",
      "desc": "Luxury folder diary containing a built-in 8,000mAh power bank, secure multi-cable charging ports, and internal card slots.",
      "specs": {
        "Battery": "8000mAh Power Bank",
        "Pages": "A5 Refillable",
        "Cable": "Lightning, Micro-USB & Type-C"
      },
      "image": "images/smart_planner_folder.png"
    },
    {
      "id": "p5",
      "category": "tech",
      "categoryLabel": "Smart Gadgets & Tech",
      "badge": "",
      "badgeText": "",
      "title": "Premium Multi-Device Fast Charge Hub",
      "price": 399,
      "minQty": 100,
      "icon": "\ud83d\udd0c",
      "desc": "Tough nylon braided multi-connector charging cable matching all modern devices. Full corporate logo plate decoration.",
      "specs": {
        "Length": "1.2 meters",
        "Connectors": "Type-C, Lightning, Micro-USB",
        "Jacket": "Double Nylon Braid"
      },
      "image": "images/bluetooth_speakers.png"
    },
    {
      "id": "p6",
      "category": "tech",
      "categoryLabel": "Smart Gadgets & Tech",
      "badge": "institutional",
      "badgeText": "Institutions",
      "title": "B2B High-Performance Tower Air Cooler",
      "price": 6499,
      "minQty": 5,
      "icon": "\u2744\ufe0f",
      "desc": "Slim institutional tower air cooler with high efficiency honeycomb cooling pads. Energy efficient for institutional bulk setups.",
      "specs": {
        "Water Capacity": "35 Liters",
        "Speed": "3-Stage Control",
        "Coverage": "Up to 150 sq.ft."
      },
      "image": "images/bluetooth_speakers.png"
    },
    {
      "id": "p7",
      "category": "drinkware",
      "categoryLabel": "Premium Office Drinkware",
      "badge": "popular",
      "badgeText": "Hot & Cold",
      "title": "Insulated Hydro Vacuum Flask (500ml)",
      "price": 449,
      "minQty": 50,
      "icon": "\ud83e\udd64",
      "desc": "Leakproof double-walled matte stainless steel vacuum bottle. Keeps beverages hot or cold for up to 24 hours.",
      "specs": {
        "Material": "Grade 304 Stainless Steel",
        "Duration": "Hot/Cold 24 Hrs",
        "Finish": "Matte Anti-Scratch"
      },
      "image": "images/vacuum_bottles.png"
    },
    {
      "id": "p8",
      "category": "drinkware",
      "categoryLabel": "Premium Office Drinkware",
      "badge": "eco",
      "badgeText": "Eco Choice",
      "title": "Coffee Husk Reusable Coffee Cup",
      "price": 249,
      "minQty": 100,
      "icon": "\u2615",
      "desc": "Eco-friendly coffee cup made from recycled natural coffee husk fibers. Double-walled insulation with tight spill-proof lid.",
      "specs": {
        "Material": "Recycled Coffee Husk Fiber",
        "Capacity": "350ml",
        "Safety": "BPA Free & Food Grade"
      },
      "image": "images/vacuum_bottles.png"
    },
    {
      "id": "p9",
      "category": "drinkware",
      "categoryLabel": "Premium Office Drinkware",
      "badge": "",
      "badgeText": "",
      "title": "Double-Walled Steel Sipper Tumbler",
      "price": 329,
      "minQty": 100,
      "icon": "\ud83e\udd64",
      "desc": "Professional double-walled stainless steel sipper with flip lid. Fits standard car cup holders. Perfect desk partner.",
      "specs": {
        "Capacity": "450ml",
        "Lid": "Leak-proof Flip Cap",
        "Branding": "Full wrap-around screen print"
      },
      "image": "images/vacuum_bottles.png"
    },
    {
      "id": "p10",
      "category": "drinkware",
      "categoryLabel": "Premium Office Drinkware",
      "badge": "eco",
      "badgeText": "Eco Thermos",
      "title": "Premium Bamboo Thermos Flask",
      "price": 549,
      "minQty": 50,
      "icon": "\ud83c\udf8b",
      "desc": "Stunning double-walled stainless steel interior wrapped in an organic bamboo casing. Includes a built-in steel tea infuser.",
      "specs": {
        "Casing": "Natural Organic Bamboo",
        "Infuser": "Removable Tea Strainer",
        "Capacity": "400ml"
      },
      "image": "images/vacuum_bottles.png"
    },
    {
      "id": "p11",
      "category": "eco",
      "categoryLabel": "Eco-Friendly Green Gifts",
      "badge": "popular",
      "badgeText": "Sustainable",
      "title": "Elite Cork Cover Planner & Organizer",
      "price": 399,
      "minQty": 50,
      "icon": "\ud83d\udcd4",
      "desc": "Sophisticated corporate planner bound in natural water-resistant organic cork casing. Contains recycled paper layout sheets.",
      "specs": {
        "Cover": "Sustainable Water-Resistant Cork",
        "Size": "A5 Standard",
        "Pages": "80 GSM Recycled Paper"
      },
      "image": "images/notebooks.png"
    },
    {
      "id": "p12",
      "category": "eco",
      "categoryLabel": "Eco-Friendly Green Gifts",
      "badge": "",
      "badgeText": "",
      "title": "Solid Oak Desk Organizer & Pen Stand",
      "price": 349,
      "minQty": 100,
      "icon": "\ud83d\udce5",
      "desc": "Natural solid oak block desk tray organizing pens, smartphones, business cards, and desktop keys neatly.",
      "specs": {
        "Material": "Premium Solid Oak Wood",
        "Design": "Multi-slot storage block",
        "Finish": "Eco Protective Varnish"
      },
      "image": "images/oak_desk_organizer.png"
    },
    {
      "id": "p13",
      "category": "eco",
      "categoryLabel": "Eco-Friendly Green Gifts",
      "badge": "popular",
      "badgeText": "Eco Bag",
      "title": "Organic Jute & Canvas Shopper Tote",
      "price": 129,
      "minQty": 200,
      "icon": "\ud83d\udc5c",
      "desc": "Heavy-duty canvas shopping bag with thick organic jute side panels and soft padded cotton handles. Excellent large branding area.",
      "specs": {
        "Fabric": "Heavy Canvas + Premium Jute",
        "Handles": "Padded soft cotton cord",
        "Capacity": "Holds up to 15 kg"
      },
      "image": "images/notebooks.png"
    },
    {
      "id": "p14",
      "category": "eco",
      "categoryLabel": "Eco-Friendly Green Gifts",
      "badge": "eco",
      "badgeText": "Natural Set",
      "title": "100% Natural Bamboo Cutlery Set",
      "price": 199,
      "minQty": 150,
      "icon": "\ud83c\udf74",
      "desc": "Reusable lightweight travel utensils set. Includes bamboo fork, knife, spoon, chopsticks, and straw inside a cotton pouch.",
      "specs": {
        "Utensils": "Bamboo Spoon, Knife, Fork, Chopsticks, Straw",
        "Pouch": "Unbleached Cotton Roll-up Pouch",
        "Care": "Washable & Bio-degradable"
      },
      "image": "images/notebooks.png"
    },
    {
      "id": "p15",
      "category": "eco",
      "categoryLabel": "Eco-Friendly Green Gifts",
      "badge": "new",
      "badgeText": "Plantable",
      "title": "Recycled Kraft Notebook & Seed Paper Pen Set",
      "price": 99,
      "minQty": 250,
      "icon": "\ud83c\udf31",
      "desc": "Recycled paper binder notebook accompanied by plantable seed paper pens. Grow tomatoes or basil once the pen runs out.",
      "specs": {
        "Notebook": "A5 Recycled Kraft paper cover",
        "Pen": "Bio-degradable paper body with seed capsule",
        "Seeds": "Tomato / Basil / Marigold"
      },
      "image": "images/notebooks.png"
    },
    {
      "id": "p16",
      "category": "monsoon",
      "categoryLabel": "Monsoon Wear & Umbrellas",
      "badge": "popular",
      "badgeText": "Windproof",
      "title": "Custom Premium Golf Umbrella",
      "price": 349,
      "minQty": 50,
      "icon": "\u26f1\ufe0f",
      "desc": "Extra Large double-canopy design. Windproof fiberglass frame protects against heavy gales. Complete print branding.",
      "specs": {
        "Material": "Premium Windproof Pongee",
        "Frame": "Double-layered fiberglass ribs",
        "Diameter": "54 inches"
      },
      "image": "images/umbrellas.png"
    },
    {
      "id": "p17",
      "category": "monsoon",
      "categoryLabel": "Monsoon Wear & Umbrellas",
      "badge": "",
      "badgeText": "",
      "title": "Auto Open folding Compact Umbrella",
      "price": 249,
      "minQty": 100,
      "icon": "\u2614",
      "desc": "Convenient one-touch button automatic opening frame. Lightweight 3-fold steel layout fits easily in laptop packs.",
      "specs": {
        "Size": "21 inches (3-fold compact)",
        "Mechanism": "One-touch auto open",
        "Shaft": "Reinforced steel"
      },
      "image": "images/umbrellas.png"
    },
    {
      "id": "p18",
      "category": "monsoon",
      "categoryLabel": "Monsoon Wear & Umbrellas",
      "badge": "new",
      "badgeText": "Reverse Fold",
      "title": "Reverse Closing Drip-Free Umbrella",
      "price": 499,
      "minQty": 50,
      "icon": "\u2602\ufe0f",
      "desc": "Innovative inverted design trapping rain water inside. Self-standing handsfree C-shaped handle grip.",
      "specs": {
        "Structure": "Double layer inside-out closing",
        "Handle": "Ergonomic C-shape grip",
        "Frame": "Anti-rust fiberglass"
      },
      "image": "images/umbrellas.png"
    },
    {
      "id": "p19",
      "category": "monsoon",
      "categoryLabel": "Monsoon Wear & Umbrellas",
      "badge": "",
      "badgeText": "",
      "title": "Full-Length Heavy Commuter Raincoat",
      "price": 399,
      "minQty": 50,
      "icon": "\ud83e\udde5",
      "desc": "Heavy-duty waterproof raincoat with full leakproof sealed seams and double-flap front snap closure. Perfect commuter wear.",
      "specs": {
        "Material": "Tough PU Coated Polyester",
        "Seams": "Taped heat-sealed joints",
        "Closure": "Heavy zip + snap button flap"
      },
      "image": "images/umbrellas.png"
    },
    {
      "id": "p20",
      "category": "monsoon",
      "categoryLabel": "Monsoon Wear & Umbrellas",
      "badge": "popular",
      "badgeText": "Safety Wear",
      "title": "Reflective Heavy Duty Safety Rain Suit",
      "price": 599,
      "minQty": 30,
      "icon": "\ud83e\uddba",
      "desc": "High visibility reflective safety strips integrated onto jacket and trousers. Crucial for warehouse, safety and transport teams.",
      "specs": {
        "Strips": "2-inch micro-prismatic reflective vinyl",
        "Suit": "Jacket with hood + matching trousers",
        "Waterproofness": "10000mm hydrostatic rating"
      },
      "image": "images/umbrellas.png"
    },
    {
      "id": "p21",
      "category": "monsoon",
      "categoryLabel": "Monsoon Wear & Umbrellas",
      "badge": "",
      "badgeText": "",
      "title": "Kids Safety Colorful Hooded Umbrella",
      "price": 149,
      "minQty": 150,
      "icon": "\u2602\ufe0f",
      "desc": "Child-safe rounded tips and easy squeeze-proof open slide. Vibrant customizable cartoon shapes and brand labels.",
      "specs": {
        "Tips": "Safety plastic cap round ends",
        "Frame": "Lightweight flexible carbon ribs",
        "Aperture": "36 inches wide"
      },
      "image": "images/umbrellas.png"
    },
    {
      "id": "p22",
      "category": "monsoon",
      "categoryLabel": "Monsoon Wear & Umbrellas",
      "badge": "new",
      "badgeText": "Lightweight",
      "title": "Emergency Pocket-Size Hooded Poncho",
      "price": 59,
      "minQty": 500,
      "icon": "\ud83e\udde5",
      "desc": "Extremely lightweight pocket-sized disposable hooded poncho. Designed as low-cost giveaways for marathons and corporate events.",
      "specs": {
        "Thickness": "0.02mm thin PE sheet",
        "Pack": "Compact spherical pouch keychain",
        "Size": "One size fits all unisex"
      },
      "image": "images/umbrellas.png"
    },
    {
      "id": "p23",
      "category": "bags",
      "categoryLabel": "Premium Bags & Travel",
      "badge": "popular",
      "badgeText": "Bestseller",
      "title": "Anti-Theft Executive Laptop Backpack",
      "price": 899,
      "minQty": 50,
      "icon": "\ud83c\udf92",
      "desc": "Secure design with concealed zipper sliders and cut-resistant layers. Includes built-in external USB charger output cord.",
      "specs": {
        "Compartment": "Holds up to 15.6 inch laptop",
        "Fabric": "Water-resistant Oxford fabric",
        "Security": "Concealed zippers"
      },
      "image": "images/bags_travel.png"
    },
    {
      "id": "p24",
      "category": "bags",
      "categoryLabel": "Premium Bags & Travel",
      "badge": "new",
      "badgeText": "TSA Approved",
      "title": "Premium Cabin Hardshell Spinner Suitcase",
      "price": 2499,
      "minQty": 20,
      "icon": "\ud83e\uddf3",
      "desc": "Rugged polycarbonate hardshell carry-on luggage. Equipped with 360-degree silent dual spinner wheels and integrated TSA lock.",
      "specs": {
        "Body": "Impact-resistant Polycarbonate",
        "Wheels": "Eight silent spinner wheels",
        "Lock": "TSA combination lock"
      },
      "image": "images/bags_travel.png"
    },
    {
      "id": "p25",
      "category": "bags",
      "categoryLabel": "Premium Bags & Travel",
      "badge": "",
      "badgeText": "",
      "title": "Tactical Gym & Travel Duffle Bag",
      "price": 549,
      "minQty": 50,
      "icon": "\ud83d\udc5c",
      "desc": "Heavy-duty canvas weekend duffle with dual carry straps, expandable side compartments, and dedicated moisture-sealed shoe pockets.",
      "specs": {
        "Pockets": "Shoe cavity + wet items bag",
        "Strap": "Detachable padded shoulder strap",
        "Capacity": "35 Liters volume"
      },
      "image": "images/bags_travel.png"
    },
    {
      "id": "p26",
      "category": "bags",
      "categoryLabel": "Premium Bags & Travel",
      "badge": "popular",
      "badgeText": "Wheeled Duffle",
      "title": "2-in-1 Wheeled Trolley Backpack",
      "price": 1290,
      "minQty": 30,
      "icon": "\ud83c\udf92",
      "desc": "Versatile executive hybrid bag functioning as a backpack and a pull-along cabin spinner with retractable trolley handle.",
      "specs": {
        "Handle": "Telescopic metal pull-out bar",
        "Capacity": "30 Liters",
        "Wheels": "Twin shockproof rubber rollers"
      },
      "image": "images/bags_travel.png"
    },
    {
      "id": "p27",
      "category": "apparel",
      "categoryLabel": "Corporate Custom Apparel",
      "badge": "popular",
      "badgeText": "100% Cotton",
      "title": "Premium Tipped Collar Polo T-Shirt",
      "price": 349,
      "minQty": 100,
      "icon": "\ud83d\udc55",
      "desc": "Elite combed cotton polo with custom matching tipped collars and sleeves. High-quality bio-washed fabric designed for office use.",
      "specs": {
        "Material": "100% Combed Cotton Pique",
        "Weight": "220 GSM heavy fabric",
        "Branding": "Computerized chest embroidery"
      },
      "image": "images/custom_apparel.png"
    },
    {
      "id": "p28",
      "category": "apparel",
      "categoryLabel": "Corporate Custom Apparel",
      "badge": "new",
      "badgeText": "Windproof",
      "title": "Fleece-Lined Weatherproof Corporate Jacket",
      "price": 899,
      "minQty": 50,
      "icon": "\ud83e\udde5",
      "desc": "Windproof fleece-lined premium weather-resistant winter jacket. Elastic wind-cuffs and secure inside smartphone slots.",
      "specs": {
        "Lining": "High-loft warm polar fleece",
        "Outer": "Waterproof Taslan layer",
        "Pocket": "Secure inner zipper cavity"
      },
      "image": "images/custom_apparel.png"
    },
    {
      "id": "p29",
      "category": "apparel",
      "categoryLabel": "Corporate Custom Apparel",
      "badge": "",
      "badgeText": "",
      "title": "Classic Twill Structured Cotton Cap",
      "price": 119,
      "minQty": 200,
      "icon": "\ud83e\udde2",
      "desc": "Vibrant structured six-panel twill cotton cap with brass metal slide adjustment strap. Breathable stitched ventilation eyes.",
      "specs": {
        "Fabric": "100% Premium Twill Cotton",
        "Structure": "6-Panel mid profile",
        "Strap": "Brass slide belt buckle"
      },
      "image": "images/custom_apparel.png"
    },
    {
      "id": "p30",
      "category": "apparel",
      "categoryLabel": "Corporate Custom Apparel",
      "badge": "eco",
      "badgeText": "Recycled",
      "title": "Eco-Conscious Recycled Poly Polo T-Shirt",
      "price": 399,
      "minQty": 100,
      "icon": "\ud83d\udc55",
      "desc": "High-performance moisture-wicking polo constructed entirely from ocean-recycled PET bottles. Helps companies achieve green mandates.",
      "specs": {
        "Fabric": "100% Ocean Recycled PET Dry-Fit",
        "Weight": "180 GSM mesh weave",
        "Branding": "Sublimation / Vinyl print"
      },
      "image": "images/custom_apparel.png"
    },
    {
      "id": "p31",
      "category": "hampers",
      "categoryLabel": "Festive & Holiday Hampers",
      "badge": "popular",
      "badgeText": "Diwali Special",
      "title": "Royal Mysore Gold Sweets & Nuts Combo Box",
      "price": 799,
      "minQty": 50,
      "icon": "\ud83c\udf81",
      "desc": "Luxurious gold-embossed diwali presentation chest containing standard cashew sweets, premium dried figs, and organic honey jars.",
      "specs": {
        "Sweets": "Mysore Pak & Premium Cashew Kaju Katli",
        "Nuts": "Salted Almonds & Pistachios 200g each",
        "Branding": "Gold foil logo printing"
      },
      "image": "images/festive_hamper.png"
    },
    {
      "id": "p32",
      "category": "hampers",
      "categoryLabel": "Festive & Holiday Hampers",
      "badge": "",
      "badgeText": "",
      "title": "Premium Copper Carafe & Tumbler Set",
      "price": 999,
      "minQty": 30,
      "icon": "\ud83c\udffa",
      "desc": "Rustic pure copper water serving carafe accompanied by two matching hand-hammered copper tumblers. Traditional B2B healthy gift.",
      "specs": {
        "Material": "99.9% Pure Certified Copper",
        "Vessel": "1-Liter Carafe jug",
        "Glasses": "Twin 250ml copper cups"
      },
      "image": "images/festive_hamper.png"
    },
    {
      "id": "p33",
      "category": "hampers",
      "categoryLabel": "Festive & Holiday Hampers",
      "badge": "popular",
      "badgeText": "Bestseller",
      "title": "Gifting Needs Custom Corporate Gift Box",
      "price": 1199,
      "minQty": 25,
      "icon": "\ud83d\udce6",
      "desc": "Handcrafted luxury corporate custom gift box combining a thermal steel bottle, matte black planner, and executive stylus pen.",
      "specs": {
        "Flask": "Vacuum Insulated Steel bottle",
        "Notebook": "Matte PU leather cover planner",
        "Branding": "UV printing on box top"
      },
      "image": "images/festive_hamper.png"
    },
    {
      "id": "p34",
      "category": "welcome",
      "categoryLabel": "Welcome Kits & Boxes",
      "badge": "popular",
      "badgeText": "Onboarding",
      "title": "Premium New-Hire Onboarding Welcome Box",
      "price": 1499,
      "minQty": 20,
      "icon": "\ud83d\udce6",
      "desc": "Exquisite luxury presentation cardboard box packing a high-end laptop backpack, unbleached cork notebook, and thermal steel mug.",
      "specs": {
        "Box": "Heavy-duty matte black luxury board",
        "Contents": "Laptop pack, Cork Diary, Insulated mug",
        "Branding": "Full kit individual engraving"
      },
      "image": "images/welcome_kits.png"
    },
    {
      "id": "p35",
      "category": "welcome",
      "categoryLabel": "Welcome Kits & Boxes",
      "badge": "",
      "badgeText": "",
      "title": "Prestige Executive Leatherette Stationery Set",
      "price": 899,
      "minQty": 50,
      "icon": "\ud83d\udcd4",
      "desc": "Elegantly matching leatherette workspace gift set matching a premium folder cover diary, executive metal cardholder, and leather keychain.",
      "specs": {
        "Folder": "A5 premium textured PU organizer",
        "Cardholder": "Stainless steel wrapped in leatherette",
        "Pen": "Heavy metal twist ballpoint"
      },
      "image": "images/welcome_kits.png"
    },
    {
      "id": "p36",
      "category": "industry",
      "categoryLabel": "Specialized Industry Gifts",
      "badge": "pharma",
      "badgeText": "Medical",
      "title": "Premium Doctor Executive Leather Portfolio Folder",
      "price": 499,
      "minQty": 50,
      "icon": "\ud83e\ude7a",
      "desc": "Classy leather folder portfolio designed for doctors and pharma executives. Holds prescription tablets, pads, and stethoscopes.",
      "specs": {
        "Material": "Premium Vegan Leatherette",
        "Compartments": "Prescription pad sleeve, phone pouch, pen slot",
        "Size": "Fits A4 sheets & 11-inch tablets"
      },
      "image": "images/specialized_industry.png"
    },
    {
      "id": "p37",
      "category": "industry",
      "categoryLabel": "Specialized Industry Gifts",
      "badge": "pharma",
      "badgeText": "Pharma Desk",
      "title": "Pharma Specialized Rotating Desk Organizer",
      "price": 299,
      "minQty": 100,
      "icon": "\ud83d\udd8a\ufe0f",
      "desc": "Custom rotating plastic and metal desk organizer stand printed with brand labels and medical guides. Holds prescription pens.",
      "specs": {
        "Feature": "360-degree silent rotation",
        "Compartments": "5 deep slots + paper clip tray",
        "Material": "High impact durable ABS plastic"
      },
      "image": "images/specialized_industry.png"
    },
    {
      "id": "p38",
      "category": "industry",
      "categoryLabel": "Specialized Industry Gifts",
      "badge": "",
      "badgeText": "",
      "title": "Doctor Custom Printed Prescription Pads (Bulk)",
      "price": 49,
      "minQty": 500,
      "icon": "\ud83d\udccb",
      "desc": "Premium writing paper pads printed with clinical details and company branding. Smooth texture optimized for fast handwriting.",
      "specs": {
        "Sheets": "100 sheets per pad",
        "Paper": "80 GSM high-bright maplitho",
        "Binding": "Glue-top easy rip pads"
      },
      "image": "images/specialized_industry.png"
    },
    {
      "id": "p39",
      "category": "industry",
      "categoryLabel": "Specialized Industry Gifts",
      "badge": "pharma",
      "badgeText": "Medical Lab",
      "title": "Stethoscope Hard Shell Protective Carry Case",
      "price": 349,
      "minQty": 100,
      "icon": "\ud83e\ude7a",
      "desc": "Shockproof EVA hardshell carry case protecting delicate clinical stethoscopes. Mesh pockets organize clinical thermometers.",
      "specs": {
        "Shell": "Drop resistant compression EVA case",
        "Lining": "Soft velvet scratch-prevent lining",
        "Pocket": "Double mesh accessory dividers"
      },
      "image": "images/specialized_industry.png"
    },
    {
      "id": "p40",
      "category": "industry",
      "categoryLabel": "Specialized Industry Gifts",
      "badge": "hospitality",
      "badgeText": "Hotel Care",
      "title": "Hospitality Premium Guest Toiletries Gift Kit",
      "price": 189,
      "minQty": 200,
      "icon": "\ud83e\uddfc",
      "desc": "Classy travel-ready guest toiletries box set combining organic botanical soaps, mini shampoos, dental kits, and shaving accessories.",
      "specs": {
        "Pouch": "Clear waterproof EVA zip slider bag",
        "Contents": "Botanical soap, shampoo, conditioner, dental pack",
        "Eco": "Paraben-free botanical formulation"
      },
      "image": "images/specialized_industry.png"
    },
    {
      "id": "p41",
      "category": "industry",
      "categoryLabel": "Specialized Industry Gifts",
      "badge": "hospitality",
      "badgeText": "Luxury Towel",
      "title": "Luxury Combed Cotton Hotel Towel Set",
      "price": 449,
      "minQty": 100,
      "icon": "\ud83e\uddd6",
      "desc": "Ultra-plush highly absorbent 100% combed cotton bath towels featuring fine dobby borders and prominent embroidered hotel brand emblem.",
      "specs": {
        "Material": "100% Organic Turkish Combed Cotton",
        "Density": "600 GSM heavy plush loops",
        "Dimensions": "Bath Towel: 30 x 60 inches"
      },
      "image": "images/specialized_industry.png"
    },
    {
      "id": "p42",
      "category": "industry",
      "categoryLabel": "Specialized Industry Gifts",
      "badge": "",
      "badgeText": "",
      "title": "Ceramic Bathroom Soap Dispenser & Tumbler Set",
      "price": 389,
      "minQty": 50,
      "icon": "\ud83e\uddf4",
      "desc": "Artisanal hand-crafted ceramic bathroom dispenser set customized with hotel properties logos. Premium metallic liquid pump head.",
      "specs": {
        "Material": "High-temperature baked clay ceramic",
        "Set": "Dispenser pump + toothbrush tumbler + soap dish",
        "Pump": "Corrosion resistant golden brass pump"
      },
      "image": "images/specialized_industry.png"
    },
    {
      "id": "p43",
      "category": "industry",
      "categoryLabel": "Specialized Industry Gifts",
      "badge": "events",
      "badgeText": "Conferences",
      "title": "Corporate Nylon Lanyard & Satin Ribbon ID Set",
      "price": 39,
      "minQty": 500,
      "icon": "\ud83c\udfab",
      "desc": "Premium satin-finish polyester lanyards custom printed with corporate brand repeating slogans. Premium chrome metal clip hook.",
      "specs": {
        "Width": "20mm standard ribbon width",
        "Clip": "Heavy-duty rotating dog-hook clasp",
        "Holder": "Clear acrylic thick ID card cardholder"
      },
      "image": "images/specialized_industry.png"
    },
    {
      "id": "p44",
      "category": "industry",
      "categoryLabel": "Specialized Industry Gifts",
      "badge": "",
      "badgeText": "",
      "title": "Custom Printed A4 Event Presentation Ring Binder",
      "price": 149,
      "minQty": 100,
      "icon": "\ud83d\udcc1",
      "desc": "Heavy-board rigid presentation ring binder folder wrapped in customized vinyl graphics. Fitted with standard 2-ring snap lever clip.",
      "specs": {
        "Board": "2.5mm rigid high-density grey board",
        "Clip": "D-shape chrome metal 2-ring clamp",
        "Capacity": "Holds up to 180 A4 sheets"
      },
      "image": "images/specialized_industry.png"
    },
    {
      "id": "p45",
      "category": "industry",
      "categoryLabel": "Specialized Industry Gifts",
      "badge": "events",
      "badgeText": "Smart Pen",
      "title": "Executive Metal Stylus Pen with Laser Engraving",
      "price": 79,
      "minQty": 200,
      "icon": "\ud83d\udd8a\ufe0f",
      "desc": "Fine metal ballpoint pen combining an integrated capacitive screen stylus tip for smartphones and tablet panels. Sleek brass barrel.",
      "specs": {
        "Ink": "Premium German black dokumental ink",
        "Stylus": "Conductive soft micro-fiber cap tip",
        "Branding": "High precision fiber laser engraving"
      },
      "image": "images/specialized_industry.png"
    }
  ],
  "inquiries": [
    {
      "id": "inq_1",
      "date": "2026-05-22T14:30:00Z",
      "name": "Rohan Sharma",
      "email": "rohan.sharma@tata.com",
      "phone": "+91 98765 43210",
      "company": "Tata Consultancy Services",
      "qty": 150,
      "timeline": "flexible",
      "productDetails": "Custom Built Welcome Box",
      "summary": "Box: Kraft Sustainable Box (\u20b990) | Items: Metal Stylus Pen, Organic Cork Diary, Smart Vacuum Mug (350ml) | Quantity: 150 | Est. Cost: \u20b91,21,776",
      "message": "Need standard embossing of TCS logo on the cork notebook and laser engraving on the insulated mug. Individual shipping to 5 different regional offices required.",
      "status": "pending"
    },
    {
      "id": "inq_2",
      "date": "2026-05-23T08:15:00Z",
      "name": "Anjali Nair",
      "email": "a.nair@infosys.com",
      "phone": "+91 99988 77766",
      "company": "Infosys Tech",
      "qty": 40,
      "timeline": "urgent",
      "productDetails": "Custom Brand 10,000mAh Power Bank (Est. Price: \u20b9649 | MOQ: 50)",
      "summary": "Custom Brand 10,000mAh Power Bank",
      "message": "We require 40 units for an executive client visit this Friday. Willing to pay extra custom setup fees for quick 3-day turnaround.",
      "status": "replied"
    }
  ],
  "design": {
    "theme": "light",
    "colors": {
      "primary": "#0B5C44",
      "primaryLight": "#117C5B",
      "primaryGlow": "rgba(11, 92, 68, 0.15)",
      "bgSecondary": "#F4F6F5",
      "bgCard": "#FFFFFF",
      "textPrimary": "#1A2622",
      "textMuted": "#606D69",
      "border": "rgba(11, 92, 68, 0.12)",
      "gold": "#D4AF37",
      "goldBright": "#F3C63F",
      "goldGlow": "rgba(212, 175, 55, 0.15)",
      "crimson": "#9E2A2B",
      "crimsonLight": "#BE3E40",
      "btnGrad": "linear-gradient(135deg, #0B5C44 0%, #063426 100%)",
      "goldGrad": "linear-gradient(135deg, #D4AF37 0%, #A37E15 100%)"
    },
    "fonts": {
      "headings": "'Playfair Display', serif",
      "body": "'Outfit', sans-serif"
    },
    "slides": [
      {
        "id": "s1",
        "active": true,
        "tag": "ONBOARDING EXCELLENCE",
        "title": "Bespoke <span>Welcome Kits</span> for Employee Success",
        "desc": "Elevate your company's onboarding experience from day one. Handcrafted custom luxury boxes packed with anti-theft backpacks, organic cork planners, steel flasks, and metal stylus pens.",
        "image": "images/welcome_kits.png"
      },
      {
        "id": "s2",
        "active": true,
        "tag": "MONSOON B2B CAMPAIGNS",
        "title": "Stay Covered. <span>Stay Branded</span> with Weather Gear",
        "desc": "High-impact corporate brand visibility in every rain. Waterproof sealed-seam raincoats, custom printed windproof golf umbrellas, and water-resistant laptop bags customized with your logo.",
        "image": "images/umbrellas.png"
      },
      {
        "id": "s3",
        "active": true,
        "tag": "SMART TECH & GADGETS",
        "title": "Premium <span>Smart Tech</span> & Executive Desk Utilities",
        "desc": "Impress your clients and award achievements with cutting-edge tech. Laser-engraved dual-port quick charge power banks, high-fidelity mesh bluetooth speakers, and wooden wireless charging docks.",
        "image": "images/bluetooth_speakers.png"
      },
      {
        "id": "s4",
        "active": true,
        "tag": "SUSTAINABLE LIFESTYLE",
        "title": "Eco-Conscious <span>Sustainable Gifts</span> for a Green Future",
        "desc": "Showcase your company's commitment to planet Earth. Recycled Kraft paper welcome sets, organic cork diaries, biodegradable coffee husk cups, and plantable seed paper notebook kits.",
        "image": "images/notebooks.png"
      }
    ],
    "navigation": [
      {
        "label": "Home",
        "href": "index.html"
      },
      {
        "label": "Products",
        "href": "products.html"
      },
      {
        "label": "Custom Kits",
        "href": "solutions.html"
      },
      {
        "label": "Dealer Scheme",
        "href": "index.html#dealer-scheme"
      },
      {
        "label": "About Us",
        "href": "about.html"
      },
      {
        "label": "Contact Us",
        "href": "contact.html"
      }
    ],
    "header": {
      "logoText": "GIFTING NEEDS",
      "logoSub": "Corporate Solutions",
      "ctaText": "Build A Kit",
      "ctaHref": "solutions.html"
    },
    "footer": {
      "logoDesc": "Crafting premium, sustainable, and highly personalized corporate hampers, welcome onboarding packs, and custom tech utilities since 2018.",
      "copyright": "\u00a9 2026 NUNULAL PODDAR | Gifting Needs. All rights reserved. GSTIN: 29AAWFG9249H1ZH",
      "contactInfo": {
        "address": "No. 124 (Old No. 123/1), 8th Cross, 19th Main Road, Marenahalli Palya, 2nd Phase, J.P. Nagar, Bengaluru \u2013 560078, Karnataka, India",
        "email": "nunulal@giftingneeds.in / sales@giftingneeds.in / info@giftingneeds.in",
        "phone": "+91 63610 54099",
        "phoneDesk": "+91 86189 67417"
      },
      "socials": {
        "facebook": "#",
        "linkedin": "#",
        "instagram": "#"
      }
    },
    "home": {
      "benefits": [
        {
          "icon": "\ud83d\udee1\ufe0f",
          "text": "Triple-stage quality checks"
        },
        {
          "icon": "\u2712\ufe0f",
          "text": "Laser logo precision"
        },
        {
          "icon": "\ud83c\udf31",
          "text": "Eco-friendly alternatives"
        },
        {
          "icon": "\ud83d\ude9a",
          "text": "Doorstep regional dispatch"
        }
      ],
      "categoryTitle": "Gifting Categories",
      "categoryDesc": "Premium selections handcrafted for employee appreciation, client onboarding, and festive seasons.",
      "categories": [
        {
          "id": "c1",
          "title": "Welcome Kits & Boxes",
          "icon": "\ud83d\udce6",
          "category": "welcome",
          "desc": "Custom new-hire welcome onboarding bundles"
        },
        {
          "id": "c2",
          "title": "Monsoon Wear & Umbrellas",
          "icon": "\u26f1\ufe0f",
          "category": "monsoon",
          "desc": "Waterproof raincoats, sports & folding umbrellas"
        },
        {
          "id": "c3",
          "title": "Premium Bags & Travel",
          "icon": "\ud83c\udf92",
          "category": "bags",
          "desc": "Anti-theft backpacks, hardshell luggage & duffles"
        },
        {
          "id": "c4",
          "title": "Corporate Custom Apparel",
          "icon": "\ud83d\udc55",
          "category": "apparel",
          "desc": "Collar tipped polos, fleece-lined windbreaker jackets & cotton caps"
        },
        {
          "id": "c5",
          "title": "Smart Gadgets & Tech",
          "icon": "\ud83d\udd0c",
          "category": "tech",
          "desc": "Power banks, wireless charging pads & mesh bluetooth speakers"
        },
        {
          "id": "c6",
          "title": "Premium Office Drinkware",
          "icon": "\ud83e\udd64",
          "category": "drinkware",
          "desc": "Insulated vacuum flasks, bottles & comfort mugs"
        },
        {
          "id": "c7",
          "title": "Eco-Friendly Green Gifts",
          "icon": "\ud83c\udf31",
          "category": "eco",
          "desc": "Jute canvas bags, bamboo structures & cork diaries"
        },
        {
          "id": "c8",
          "title": "Festive & Holiday Hampers",
          "icon": "\ud83c\udf81",
          "category": "hampers",
          "desc": "Gourmet nut jars, sweets boxes & dry fruit combos"
        },
        {
          "id": "c9",
          "title": "Specialized Industry Gifts",
          "icon": "\ud83e\ude7a",
          "category": "industry",
          "desc": "Doctor/pharma gifting, hotel utilities & event lanyards"
        }
      ]
    },
    "about": {
      "heroTitle": "Partnering In Your Corporate Growth",
      "heroDesc": "Established in 2018 in Bengaluru, Gifting Needs set out with a simple mission: to elevate the quality, appeal, and experience of corporate gift giving in India. From welcome boxes to high-fidelity tech hampers, we manage curation, packaging, and individual doorstep fulfillment.",
      "valuesTitle": "The Gifting Needs Commitment",
      "valuesDesc": "We follow strict processes to ensure your company logo is rendered with utmost precision and beauty across all product surfaces.",
      "values": [
        {
          "icon": "\ud83d\udee1\ufe0f",
          "title": "Triple Stage Quality Checks",
          "desc": "Every diary binding, power bank battery, and mug insulated seal is verified by hand prior to box arrangement and dispatch."
        },
        {
          "icon": "\u2712\ufe0f",
          "title": "Surfaced Brand Precision",
          "desc": "Using fiber laser engravers for metal cups, custom screen printing for notebooks, and Japanese sewing machines for polo embroidery."
        },
        {
          "icon": "\ud83c\udf31",
          "title": "Sustainable Alternatives",
          "desc": "We offer a vast selection of organic cork cover planners, bamboo desk holders, husk drinkware, and fully recyclable kraft boxes."
        }
      ],
      "timeline": [
        {
          "year": "2018",
          "title": "Inception",
          "desc": "Founded Gifting Needs in Bengaluru with standard office stationery items, catering to local IT startups."
        },
        {
          "year": "2020",
          "title": "Tech Integration",
          "desc": "Expanded catalog to power banks, Bluetooth audio speakers, and customized tech utilities for virtual onboarding."
        },
        {
          "year": "2023",
          "title": "Green Initiative",
          "desc": "Introduced organic bamboo and cork stationery ranges. Designed welcome kit builder models for remote employees."
        },
        {
          "year": "Present Day",
          "title": "Nationwide Scale",
          "desc": "Fulfilling bulk shipments to over 200+ companies with automated warehouse dispatch and tracking support."
        }
      ]
    },
    "contact": {
      "mapLink": "https://maps.google.com",
      "faqs": [
        {
          "question": "What is the Minimum Order Quantity (MOQ)?",
          "answer": "To sustain custom printing and production setups, our MOQ is 50 units for tech, apparel, and stationery products, and 25 units for curated festive hampers or welcome kit boxes. For quantities below this, a setup fee of \u20b92,500 is applied."
        },
        {
          "question": "Can you dispatch kits directly to remote employee homes?",
          "answer": "Yes, absolutely! We manage individual courier fulfillment across India. You provide the address sheet, and we package, seal, track, and ship each kit directly to the employee's doorstep, sending you a unified tracking dashboard."
        },
        {
          "question": "How does custom brand logo printing work?",
          "answer": "Once you submit your vector logo (PDF, AI, or EPS format), our designer generates a digital sample mock-up within 4 hours. Upon approval, we use suitable methods: laser engraving for stainless bottles/pens, screen printing for diary covers, and thread embroidery for fabrics."
        },
        {
          "question": "Do you ship physical product samples?",
          "answer": "Yes. We ship physical unbranded samples for quality verification (charged at standard single unit cost). For confirmed orders exceeding 100 boxes, we ship a fully customized branded sample box for physical verification prior to mass production."
        },
        {
          "question": "What are the corporate payment terms?",
          "answer": "Our standard billing terms require a 50% advance payment to initiate production and customization. The remaining 50% balance payment is settled upon quality check certification and dispatch, prior to shipment arrival. We accept bank NEFT, RTGS, UPI, and major corporate cards."
        }
      ]
    },
    "solutions": {
      "title": "Build Your Custom Corporate Gift Box",
      "desc": "Design a bespoke Welcome Kit or Employee Hamper. Select your gift box styling, select products to fill it, adjust quantity, and submit for a formal mock-up quote.",
      "boxTypes": [
        {
          "id": "kraft",
          "name": "Kraft Sustainable Box",
          "price": 90,
          "icon": "\ud83d\udce6",
          "desc": "100% recycled eco-kraft paperboard box with earth-friendly soy ink stamp."
        },
        {
          "id": "matte",
          "name": "Premium Matte Black Box",
          "price": 180,
          "icon": "\ud83d\udcbc",
          "desc": "Magnetic closure luxury matte black card box, lined with velvet foam inserts."
        },
        {
          "id": "gilded",
          "name": "Gilded Festive Box",
          "price": 220,
          "icon": "\u2728",
          "desc": "Royal green box adorned with metallic gold foil traditional motifs."
        }
      ],
      "builderItems": [
        {
          "id": "bi1",
          "name": "Metal Stylus Pen",
          "price": 99,
          "icon": "\ud83d\udd8a\ufe0f"
        },
        {
          "id": "bi2",
          "name": "Organic Cork Diary",
          "price": 249,
          "icon": "\ud83d\udcd3"
        },
        {
          "id": "bi3",
          "name": "Smart Vacuum Mug (350ml)",
          "price": 349,
          "icon": "\u2615"
        },
        {
          "id": "bi4",
          "name": "10,000mAh Power Bank",
          "price": 649,
          "icon": "\ud83d\udd0b"
        },
        {
          "id": "bi5",
          "name": "Bluetooth Metal Speaker",
          "price": 899,
          "icon": "\ud83d\udd0a"
        },
        {
          "id": "bi6",
          "name": "Cashew & Almond Jars Set",
          "price": 550,
          "icon": "\ud83c\udffa"
        },
        {
          "id": "bi7",
          "name": "Sustainable Bamboo Planter",
          "price": 199,
          "icon": "\ud83c\udf31"
        },
        {
          "id": "bi8",
          "name": "Genuine Leather Cardholder",
          "price": 299,
          "icon": "\ud83d\udcb3"
        }
      ]
    },
    "categories": [
      {
        "id": "c1",
        "title": "Welcome Kits & Boxes",
        "icon": "\ud83d\udce6",
        "category": "welcome",
        "desc": "Custom new-hire welcome onboarding bundles"
      },
      {
        "id": "c2",
        "title": "Monsoon Wear & Umbrellas",
        "icon": "\u26f1\ufe0f",
        "category": "monsoon",
        "desc": "Waterproof raincoats, sports & folding umbrellas"
      },
      {
        "id": "c3",
        "title": "Premium Bags & Travel",
        "icon": "\ud83c\udf92",
        "category": "bags",
        "desc": "Anti-theft backpacks, hardshell luggage & duffles"
      },
      {
        "id": "c4",
        "title": "Corporate Custom Apparel",
        "icon": "\ud83d\udc55",
        "category": "apparel",
        "desc": "Collar tipped polos, fleece-lined windbreaker jackets & cotton caps"
      },
      {
        "id": "c5",
        "title": "Smart Gadgets & Tech",
        "icon": "\ud83d\udd0c",
        "category": "tech",
        "desc": "Power banks, wireless charging pads & mesh bluetooth speakers"
      },
      {
        "id": "c6",
        "title": "Premium Office Drinkware",
        "icon": "\ud83e\udd64",
        "category": "drinkware",
        "desc": "Insulated vacuum flasks, bottles & comfort mugs"
      },
      {
        "id": "c7",
        "title": "Eco-Friendly Green Gifts",
        "icon": "\ud83c\udf31",
        "category": "eco",
        "desc": "Jute canvas bags, bamboo structures & cork diaries"
      },
      {
        "id": "c8",
        "title": "Festive & Holiday Hampers",
        "icon": "\ud83c\udf81",
        "category": "hampers",
        "desc": "Gourmet nut jars, sweets boxes & dry fruit combos"
      },
      {
        "id": "c9",
        "title": "Specialized Industry Gifts",
        "icon": "\ud83e\ude7a",
        "category": "industry",
        "desc": "Doctor/pharma gifting, hotel utilities & event lanyards"
      }
    ]
  },
  "logs": [
    {
      "date": "2026-05-31T08:39:52.059Z",
      "event": "Express Backend started successfully on port 3001."
    },
    {
      "date": "2026-05-23T07:52:42.248Z",
      "event": "User \"admin\" (admin) logged in successfully."
    },
    {
      "date": "2026-05-23T06:27:16.473Z",
      "event": "Visual design override parameters updated by admin."
    },
    {
      "date": "2026-05-23T06:26:42.302Z",
      "event": "Visual design override parameters updated by admin."
    },
    {
      "date": "2026-05-23T06:26:39.525Z",
      "event": "Visual design override parameters updated by admin."
    },
    {
      "date": "2026-05-23T04:44:02.949Z",
      "event": "User \"admin\" (admin) logged in successfully."
    },
    {
      "date": "2026-05-23T04:37:28.293Z",
      "event": "User \"admin\" (admin) logged in successfully."
    },
    {
      "date": "2026-05-23T04:17:57.331Z",
      "event": "Product \"Custom Brand 10,000mAh Power Bank\" (ID: p1) updated by admin."
    },
    {
      "date": "2026-05-23T04:16:43.178Z",
      "event": "Product \"Custom Brand 10,000mAh Power Bank\" (ID: p1) updated by admin."
    },
    {
      "date": "2026-05-23T04:16:41.264Z",
      "event": "File uploaded: \"uploads/Image01_1779509801261.jpg\" by admin."
    },
    {
      "date": "2026-05-23T04:16:41.254Z",
      "event": "File uploaded: \"uploads/Image01_1779509801253.jpg\" by admin."
    },
    {
      "date": "2026-05-23T04:16:06.804Z",
      "event": "User \"admin\" (admin) logged in successfully."
    },
    {
      "date": "2026-05-23T04:14:58.880Z",
      "event": "File uploaded: \"uploads/test_pixel_1779509698877.png\" by admin."
    },
    {
      "date": "2026-05-23T04:14:58.859Z",
      "event": "User \"admin\" (admin) logged in successfully."
    },
    {
      "date": "2026-05-23T04:14:25.595Z",
      "event": "Express Backend started successfully on port 3000."
    },
    {
      "date": "2026-05-23T04:06:28.100Z",
      "event": "Visual design override parameters updated by admin."
    },
    {
      "date": "2026-05-23T04:06:00.760Z",
      "event": "Visual design override parameters updated by admin."
    },
    {
      "date": "2026-05-23T04:05:39.344Z",
      "event": "Visual design override parameters updated by admin."
    },
    {
      "date": "2026-05-23T04:04:59.089Z",
      "event": "User \"admin\" (admin) logged in successfully."
    },
    {
      "date": "2026-05-23T04:04:29.999Z",
      "event": "AI Bot Action: Added menu link \"Offers\" (products.html) via chat. Request by admin."
    },
    {
      "date": "2026-05-23T04:04:29.990Z",
      "event": "AI Bot Action: Updated footer helpline phone. Request by admin."
    },
    {
      "date": "2026-05-23T04:04:29.977Z",
      "event": "AI Bot Action: Updated footer address coordinates. Request by admin."
    },
    {
      "date": "2026-05-23T04:04:29.952Z",
      "event": "User \"admin\" (admin) logged in successfully."
    },
    {
      "date": "2026-05-23T04:04:24.633Z",
      "event": "Express Backend started successfully on port 3000."
    },
    {
      "date": "2026-05-23T04:04:18.075Z",
      "event": "AI Bot Action: Added menu link \"named Offers\" (products.html) via chat. Request by admin."
    },
    {
      "date": "2026-05-23T04:04:18.072Z",
      "event": "AI Bot Action: Updated footer helpline phone. Request by admin."
    },
    {
      "date": "2026-05-23T04:04:18.065Z",
      "event": "AI Bot Action: Updated footer address coordinates. Request by admin."
    },
    {
      "date": "2026-05-23T04:04:18.058Z",
      "event": "User \"admin\" (admin) logged in successfully."
    },
    {
      "date": "2026-05-23T04:03:51.451Z",
      "event": "AI Bot Action: Added menu link \"named Offers\" (products.html) via chat. Request by admin."
    },
    {
      "date": "2026-05-23T04:03:51.444Z",
      "event": "AI Bot Action: Updated footer helpline phone. Request by admin."
    },
    {
      "date": "2026-05-23T04:03:51.438Z",
      "event": "AI Bot Action: Updated footer address coordinates. Request by admin."
    },
    {
      "date": "2026-05-23T04:03:51.426Z",
      "event": "User \"admin\" (admin) logged in successfully."
    },
    {
      "date": "2026-05-23T04:03:35.723Z",
      "event": "Express Backend started successfully on port 3000."
    },
    {
      "date": "2026-05-23T04:00:00Z",
      "event": "Overwrote database state file directly to register complete UI text nodes."
    }
  ]
};

// Atomically read DB
// Atomically read DB
// Atomically read DB
// Atomically read DB
// Atomically read DB
// Atomically read DB
// Atomically read DB
function read() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      write(DEFAULT_STATE);
      return DEFAULT_STATE;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading database file, returning defaults:", err);
    return DEFAULT_STATE;
  }
}

// Atomically write DB using temp file to prevent half-written files
function write(data) {
  const tempPath = DB_PATH + '.tmp';
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, DB_PATH);
    return true;
  } catch (err) {
    console.error("Fatal: failed atomic write to database:", err);
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (_) {}
    }
    return false;
  }
}

module.exports = {
  read,
  write,
  addLog: (eventText) => {
    const data = read();
    data.logs.unshift({ date: new Date().toISOString(), event: eventText });
    // Cap logs to 150 items
    if (data.logs.length > 150) data.logs = data.logs.slice(0, 150);
    write(data);
  }
};
