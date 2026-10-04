import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Foundational Database Seed ---');

  // ==========================================
  // 1. ROLES & PERMISSIONS
  // ==========================================
  console.log('Seeding Roles and Permissions...');

  const permissionNames = [
    'company.read',
    'company.write',
    'employee.read',
    'employee.write',
    'catalogue.read',
    'catalogue.write',
    'menu.read',
    'menu.write',
    'pricing.read',
    'pricing.write',
    'order.read',
    'order.create',
    'order.update',
    'order.cancel',
    'kitchen.read',
    'kitchen.update',
    'dispatch.read',
    'dispatch.update',
    'delivery.read',
    'delivery.update',
    'billing.read',
    'billing.write',
    'settings.read',
    'settings.write',
  ];

  const permissions: Record<string, { id: string; name: string }> = {};
  for (const name of permissionNames) {
    const p = await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    permissions[name] = p;
  }

  const rolesData = [
    {
      name: 'ADMIN',
      permissions: permissionNames,
    },
    {
      name: 'KITCHEN',
      permissions: ['kitchen.read', 'kitchen.update', 'order.read', 'catalogue.read', 'menu.read'],
    },
    {
      name: 'DISPATCH',
      permissions: ['dispatch.read', 'dispatch.update', 'delivery.read', 'delivery.update', 'order.read', 'company.read'],
    },
    {
      name: 'DRIVER',
      permissions: ['delivery.read', 'delivery.update'],
    },
  ];

  const roles: Record<string, { id: string; name: string }> = {};
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: { name: r.name },
    });
    roles[r.name] = role;

    for (const permName of r.permissions) {
      const perm = permissions[permName];
      if (perm) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: perm.id,
          },
        });
      }
    }
  }

  // ==========================================
  // 2. USERS
  // ==========================================
  console.log('Seeding 4 Required Operational Users...');
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('Test@1234', salt);

  const usersToSeed = [
    { email: 'admin@test.com', role: 'ADMIN' },
    { email: 'kitchen@test.com', role: 'KITCHEN' },
    { email: 'dispatch@test.com', role: 'DISPATCH' },
    { email: 'driver@test.com', role: 'DRIVER' },
  ];

  for (const u of usersToSeed) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash,
        roleId: roles[u.role].id,
        isActive: true,
      },
      create: {
        email: u.email,
        passwordHash,
        roleId: roles[u.role].id,
        isActive: true,
      },
    });
  }

  // ==========================================
  // 3. PRICE TIERS
  // ==========================================
  console.log('Seeding Price Tiers...');
  const defaultTier = await prisma.priceTier.upsert({
    where: { name: 'Default' },
    update: { isDefault: true, isActive: true },
    create: { name: 'Default', isDefault: true, isActive: true },
  });

  const corporateTier = await prisma.priceTier.upsert({
    where: { name: 'Corporate' },
    update: { isDefault: false, isActive: true },
    create: { name: 'Corporate', isDefault: false, isActive: true },
  });

  const premiumTier = await prisma.priceTier.upsert({
    where: { name: 'Premium' },
    update: { isDefault: false, isActive: true },
    create: { name: 'Premium', isDefault: false, isActive: true },
  });

  // ==========================================
  // 4. CATALOGUE ATTRIBUTES (Stations, Portions, Allergens, Tags)
  // ==========================================
  console.log('Seeding Kitchen Stations, Portions, Allergens, Tags...');

  const stationNames = ['Hot Kitchen', 'Cold & Salad Station', 'Grill & Tandoor', 'Bakery & Dessert', 'Beverage Bar'];
  const stations: Record<string, { id: string; name: string }> = {};
  for (const name of stationNames) {
    stations[name] = await prisma.kitchenStation.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }

  const portionNames = ['Regular', 'Large', 'Mini'];
  const portions: Record<string, { id: string; name: string }> = {};
  for (const name of portionNames) {
    portions[name] = await prisma.portion.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const allergenNames = ['Peanuts', 'Dairy', 'Gluten', 'Shellfish', 'Soy', 'Tree Nuts'];
  const allergens: Record<string, { id: string; name: string }> = {};
  for (const name of allergenNames) {
    allergens[name] = await prisma.allergen.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const dietaryTagNames = ['Vegetarian', 'Vegan', 'Gluten-Free', 'High-Protein', 'Keto-Friendly'];
  const dietaryTags: Record<string, { id: string; name: string }> = {};
  for (const name of dietaryTagNames) {
    dietaryTags[name] = await prisma.dietaryTag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // ==========================================
  // 5. OPTIONS & OPTION GROUPS
  // ==========================================
  console.log('Seeding Options and Option Groups...');

  const optionsData = [
    { name: 'Extra Grilled Chicken', costInPaise: 5000 },
    { name: 'Extra Spiced Paneer', costInPaise: 4000 },
    { name: 'Boiled Egg (2 pcs)', costInPaise: 2500 },
    { name: 'Avocado Slice', costInPaise: 3500 },
    { name: 'Lemon Tahini Dressing', costInPaise: 1500 },
    { name: 'Balsamic Vinaigrette', costInPaise: 1500 },
    { name: 'Artisan Sourdough Slice', costInPaise: 2000 },
    { name: 'Gluten-Free Seed Bread', costInPaise: 2500 },
  ];

  const createdOptions: Record<string, any> = {};
  for (const opt of optionsData) {
    const existing = await prisma.option.findFirst({ where: { name: opt.name } });
    if (existing) {
      createdOptions[opt.name] = existing;
    } else {
      createdOptions[opt.name] = await prisma.option.create({
        data: { name: opt.name, costInPaise: opt.costInPaise, isActive: true },
      });
    }

    // Seed Option Prices for all price tiers
    const tierMultiplier: Record<string, number> = {
      Default: 1.0,
      Corporate: 0.9,
      Premium: 1.2,
    };
    for (const [tierName, tierObj] of Object.entries({ Default: defaultTier, Corporate: corporateTier, Premium: premiumTier })) {
      const price = Math.round(opt.costInPaise * 1.5 * (tierMultiplier[tierName] || 1.0));
      await prisma.optionPrice.upsert({
        where: {
          optionId_priceTierId: {
            optionId: createdOptions[opt.name].id,
            priceTierId: tierObj.id,
          },
        },
        update: { priceInPaise: price },
        create: {
          optionId: createdOptions[opt.name].id,
          priceTierId: tierObj.id,
          priceInPaise: price,
        },
      });
    }
  }

  // Option Groups
  const group1 = await prisma.optionGroup.create({
    data: { name: 'Protein Add-ons', isRequired: false, isActive: true },
  });
  await prisma.optionGroupOption.createMany({
    data: [
      { optionGroupId: group1.id, optionId: createdOptions['Extra Grilled Chicken'].id },
      { optionGroupId: group1.id, optionId: createdOptions['Extra Spiced Paneer'].id },
      { optionGroupId: group1.id, optionId: createdOptions['Boiled Egg (2 pcs)'].id },
    ],
    skipDuplicates: true,
  });

  const group2 = await prisma.optionGroup.create({
    data: { name: 'Salad Dressing Choice', isRequired: false, isActive: true },
  });
  await prisma.optionGroupOption.createMany({
    data: [
      { optionGroupId: group2.id, optionId: createdOptions['Lemon Tahini Dressing'].id },
      { optionGroupId: group2.id, optionId: createdOptions['Balsamic Vinaigrette'].id },
    ],
    skipDuplicates: true,
  });

  const group3 = await prisma.optionGroup.create({
    data: { name: 'Bread Option', isRequired: false, isActive: true },
  });
  await prisma.optionGroupOption.createMany({
    data: [
      { optionGroupId: group3.id, optionId: createdOptions['Artisan Sourdough Slice'].id },
      { optionGroupId: group3.id, optionId: createdOptions['Gluten-Free Seed Bread'].id },
    ],
    skipDuplicates: true,
  });

  // ==========================================
  // 6. DISHES & DISH PRICES
  // ==========================================
  console.log('Seeding 8 Dishes with Tiered Pricing...');

  const dishesData = [
    {
      name: 'Mediterranean Grilled Chicken Bowl',
      sku: 'DISH-CKN-01',
      description: 'Charred herb chicken, roasted peppers, quinoa, hummus, and lemon herb emulsion.',
      costInPaise: 18000,
      station: 'Grill & Tandoor',
      portion: 'Regular',
      basePrice: 28000,
      optionGroups: [group1.id],
    },
    {
      name: 'Tandoori Spiced Paneer Protein Bowl',
      sku: 'DISH-PNR-02',
      description: 'Marinated cottage cheese, spiced chickpeas, brown rice, mint chutney.',
      costInPaise: 15000,
      station: 'Grill & Tandoor',
      portion: 'Regular',
      basePrice: 24000,
      optionGroups: [group1.id],
    },
    {
      name: 'Super Green Avocado & Kale Caesar Salad',
      sku: 'DISH-SLD-03',
      description: 'Baby kale, crisp romaine, Hass avocado, toasted pumpkin seeds, parmesan shards.',
      costInPaise: 14000,
      station: 'Cold & Salad Station',
      portion: 'Regular',
      basePrice: 22000,
      optionGroups: [group2.id, group1.id],
    },
    {
      name: 'Wild Truffle & Porcini Penne',
      sku: 'DISH-PST-04',
      description: 'Durum wheat pasta, wild sautéed mushrooms, truffle cream sauce, fresh parsley.',
      costInPaise: 20000,
      station: 'Hot Kitchen',
      portion: 'Regular',
      basePrice: 32000,
      optionGroups: [],
    },
    {
      name: 'Artisanal Smoked Chicken Club Sandwich',
      sku: 'DISH-SND-05',
      description: 'Slow-smoked chicken breast, turkey bacon, heirloom tomatoes on toasted bread.',
      costInPaise: 13000,
      station: 'Cold & Salad Station',
      portion: 'Regular',
      basePrice: 21000,
      optionGroups: [group3.id],
    },
    {
      name: 'Slow Simmered Dal Makhani Executive Box',
      sku: 'DISH-DAL-06',
      description: 'Overnight black lentils simmered with white butter, served with jeera rice & kulcha.',
      costInPaise: 14000,
      station: 'Hot Kitchen',
      portion: 'Large',
      basePrice: 23000,
      optionGroups: [],
    },
    {
      name: 'Chia Seed Mango & Coconut Parfait',
      sku: 'DISH-DES-07',
      description: 'Alphonso mango puree, coconut milk chia pudding, toasted almond flakes.',
      costInPaise: 8000,
      station: 'Bakery & Dessert',
      portion: 'Mini',
      basePrice: 14000,
      optionGroups: [],
    },
    {
      name: 'Cold Pressed Orange Carrot Immunity Elixir',
      sku: 'DISH-JCE-08',
      description: 'Valencia oranges, organic carrots, fresh ginger, dash of turmeric.',
      costInPaise: 7000,
      station: 'Beverage Bar',
      portion: 'Regular',
      basePrice: 12000,
      optionGroups: [],
    },
  ];

  const createdDishes: Record<string, any> = {};
  for (const d of dishesData) {
    const dish = await prisma.dish.upsert({
      where: { sku: d.sku },
      update: {
        name: d.name,
        description: d.description,
        costInPaise: d.costInPaise,
        kitchenStationId: stations[d.station]?.id,
        portionId: portions[d.portion]?.id,
        isActive: true,
      },
      create: {
        name: d.name,
        sku: d.sku,
        description: d.description,
        costInPaise: d.costInPaise,
        kitchenStationId: stations[d.station]?.id,
        portionId: portions[d.portion]?.id,
        isActive: true,
      },
    });
    createdDishes[d.sku] = dish;

    // Associate Option Groups
    for (const ogId of d.optionGroups) {
      await prisma.dishOptionGroup.upsert({
        where: {
          dishId_optionGroupId: {
            dishId: dish.id,
            optionGroupId: ogId,
          },
        },
        update: {},
        create: {
          dishId: dish.id,
          optionGroupId: ogId,
        },
      });
    }

    // Dish Prices for Default, Corporate, Premium
    const tierPrices: Record<string, number> = {
      Default: d.basePrice,
      Corporate: Math.round(d.basePrice * 0.9), // 10% discount for corporate contract
      Premium: Math.round(d.basePrice * 1.15), // Premium packaging/express tier
    };

    for (const [tierName, tierObj] of Object.entries({ Default: defaultTier, Corporate: corporateTier, Premium: premiumTier })) {
      await prisma.dishPrice.upsert({
        where: {
          dishId_priceTierId: {
            dishId: dish.id,
            priceTierId: tierObj.id,
          },
        },
        update: { priceInPaise: tierPrices[tierName] },
        create: {
          dishId: dish.id,
          priceTierId: tierObj.id,
          priceInPaise: tierPrices[tierName],
        },
      });
    }
  }

  // ==========================================
  // 7. MENU & CATEGORIES
  // ==========================================
  console.log('Seeding Menu, Categories, and Items...');

  const activeMenu = await prisma.menu.create({
    data: {
      name: 'Chef Select Daily Lunch Menu',
      isActive: true,
    },
  });

  const cat1 = await prisma.menuCategory.create({
    data: {
      menuId: activeMenu.id,
      name: 'Power Protein Bowls & Mains',
      sortOrder: 1,
      isActive: true,
    },
  });

  const cat2 = await prisma.menuCategory.create({
    data: {
      menuId: activeMenu.id,
      name: 'Artisan Salads & Sandwiches',
      sortOrder: 2,
      isActive: true,
    },
  });

  const cat3 = await prisma.menuCategory.create({
    data: {
      menuId: activeMenu.id,
      name: 'Desserts & Cold Drinks',
      sortOrder: 3,
      isActive: true,
    },
  });

  // Assign Dishes to Categories
  const categoryAssignments = [
    { categoryId: cat1.id, sku: 'DISH-CKN-01', sortOrder: 1 },
    { categoryId: cat1.id, sku: 'DISH-PNR-02', sortOrder: 2 },
    { categoryId: cat1.id, sku: 'DISH-PST-04', sortOrder: 3 },
    { categoryId: cat1.id, sku: 'DISH-DAL-06', sortOrder: 4 },
    { categoryId: cat2.id, sku: 'DISH-SLD-03', sortOrder: 1 },
    { categoryId: cat2.id, sku: 'DISH-SND-05', sortOrder: 2 },
    { categoryId: cat3.id, sku: 'DISH-DES-07', sortOrder: 1 },
    { categoryId: cat3.id, sku: 'DISH-JCE-08', sortOrder: 2 },
  ];

  for (const item of categoryAssignments) {
    await prisma.categoryItem.upsert({
      where: {
        categoryId_dishId: {
          categoryId: item.categoryId,
          dishId: createdDishes[item.sku].id,
        },
      },
      update: { sortOrder: item.sortOrder },
      create: {
        categoryId: item.categoryId,
        dishId: createdDishes[item.sku].id,
        sortOrder: item.sortOrder,
      },
    });
  }

  // ==========================================
  // 8. COMPANIES, ADDRESSES, WORKING DAYS, HOLIDAYS
  // ==========================================
  console.log('Seeding 3 Companies with Addresses and Schedules...');

  // Company 1: Acme Tech Corp
  const company1 = await prisma.company.create({
    data: {
      name: 'Acme Tech Corp',
      billingContact: 'finance@acme.com',
      priceTierId: corporateTier.id,
      defaultDeliveryTime: '12:30',
      minutesBeforeDelivery: 45,
      defaultPackaging: 'Eco-Friendly Box',
      driverInstructions: 'Deliver to 4th floor reception via East Cargo Elevator.',
      isActive: true,
    },
  });

  // Company 2: TechNova Labs
  const company2 = await prisma.company.create({
    data: {
      name: 'TechNova Labs',
      billingContact: 'ap@technova.io',
      priceTierId: defaultTier.id,
      defaultDeliveryTime: '13:00',
      minutesBeforeDelivery: 60,
      defaultPackaging: 'Standard Thermal Bag',
      driverInstructions: 'Security check at Gate 2, call building desk.',
      isActive: true,
    },
  });

  // Company 3: Global Zenith Capital
  const company3 = await prisma.company.create({
    data: {
      name: 'Global Zenith Capital',
      billingContact: 'billing@globalzenith.com',
      priceTierId: premiumTier.id,
      defaultDeliveryTime: '12:00',
      minutesBeforeDelivery: 30,
      defaultPackaging: 'Executive Bento Box',
      driverInstructions: 'VIP drop-off at Tower B front concierge.',
      isActive: true,
    },
  });

  const companies = [company1, company2, company3];

  // Addresses
  const addressData = [
    {
      companyId: company1.id,
      label: 'Acme HQ Tower A',
      addressLine1: 'Plot 42, Tech Vista Corridor',
      addressLine2: 'Outer Ring Road, Kadubeesanahalli',
      city: 'Bengaluru',
      pincode: '560103',
      isDefault: true,
    },
    {
      companyId: company1.id,
      label: 'Acme Innovation Center',
      addressLine1: 'Building 7, Embassy TechVillage',
      addressLine2: 'Devarabisanahalli',
      city: 'Bengaluru',
      pincode: '560103',
      isDefault: false,
    },
    {
      companyId: company2.id,
      label: 'TechNova Campus Main',
      addressLine1: 'Cyber Gateway Phase 2',
      addressLine2: 'Hitech City, Madhapur',
      city: 'Hyderabad',
      pincode: '500081',
      isDefault: true,
    },
    {
      companyId: company3.id,
      label: 'Zenith Financial Tower',
      addressLine1: 'Level 21, One World Center',
      addressLine2: 'Senapati Bapat Marg, Lower Parel',
      city: 'Mumbai',
      pincode: '400013',
      isDefault: true,
    },
  ];

  for (const addr of addressData) {
    await prisma.companyAddress.create({ data: addr });
  }

  // Working Days (Monday - Friday are active, Saturday - Sunday closed)
  for (const comp of companies) {
    for (let day = 1; day <= 7; day++) {
      await prisma.companyWorkingDay.create({
        data: {
          companyId: comp.id,
          dayOfWeek: day,
          isWorking: day <= 5, // Mon-Fri
        },
      });
    }

    // Holidays
    await prisma.companyHoliday.createMany({
      data: [
        {
          companyId: comp.id,
          date: new Date('2026-10-20T00:00:00.000Z'),
          reason: 'Company Annual Retreat',
        },
        {
          companyId: comp.id,
          date: new Date('2026-11-09T00:00:00.000Z'),
          reason: 'Diwali Festival',
        },
        {
          companyId: comp.id,
          date: new Date('2026-12-25T00:00:00.000Z'),
          reason: 'Christmas Holiday',
        },
      ],
    });
  }

  // Company Hidden Dishes & Categories
  // Acme Tech Corp restricts desserts & drinks category
  await prisma.companyHiddenCategory.create({
    data: {
      companyId: company1.id,
      categoryId: cat3.id,
    },
  });

  // TechNova Labs restricts expensive truffle pasta
  await prisma.companyHiddenDish.create({
    data: {
      companyId: company2.id,
      dishId: createdDishes['DISH-PST-04'].id,
    },
  });

  // ==========================================
  // 9. EMPLOYEES
  // ==========================================
  console.log('Seeding 9 Employees (3 per company)...');

  const employeesData = [
    // Acme Employees
    {
      companyId: company1.id,
      name: 'Rohan Sharma',
      email: 'rohan.sharma@acme.com',
      canChooseAddress: true,
      canChangeDeliveryTime: true,
      canChangePackaging: false,
      allergens: ['Peanuts'],
      dietaryTags: ['High-Protein'],
    },
    {
      companyId: company1.id,
      name: 'Priya Iyer',
      email: 'priya.iyer@acme.com',
      canChooseAddress: false,
      canChangeDeliveryTime: false,
      canChangePackaging: true,
      allergens: ['Gluten'],
      dietaryTags: ['Vegetarian', 'Gluten-Free'],
    },
    {
      companyId: company1.id,
      name: 'Arjun Mehta',
      email: 'arjun.mehta@acme.com',
      canChooseAddress: true,
      canChangeDeliveryTime: false,
      canChangePackaging: false,
      allergens: [],
      dietaryTags: ['Keto-Friendly'],
    },

    // TechNova Employees
    {
      companyId: company2.id,
      name: 'Neha Kapoor',
      email: 'neha.k@technova.io',
      canChooseAddress: true,
      canChangeDeliveryTime: true,
      canChangePackaging: true,
      allergens: ['Dairy'],
      dietaryTags: ['Vegan'],
    },
    {
      companyId: company2.id,
      name: 'Vikram Rao',
      email: 'vikram.r@technova.io',
      canChooseAddress: false,
      canChangeDeliveryTime: false,
      canChangePackaging: false,
      allergens: [],
      dietaryTags: ['High-Protein'],
    },
    {
      companyId: company2.id,
      name: 'Ananya Sen',
      email: 'ananya.s@technova.io',
      canChooseAddress: false,
      canChangeDeliveryTime: true,
      canChangePackaging: false,
      allergens: ['Shellfish', 'Tree Nuts'],
      dietaryTags: ['Vegetarian'],
    },

    // Global Zenith Employees
    {
      companyId: company3.id,
      name: 'Aditya Birla',
      email: 'aditya.birla@globalzenith.com',
      canChooseAddress: true,
      canChangeDeliveryTime: true,
      canChangePackaging: true,
      allergens: [],
      dietaryTags: [],
    },
    {
      companyId: company3.id,
      name: 'Kavita Nair',
      email: 'kavita.nair@globalzenith.com',
      canChooseAddress: false,
      canChangeDeliveryTime: false,
      canChangePackaging: false,
      allergens: ['Gluten'],
      dietaryTags: ['Gluten-Free'],
    },
    {
      companyId: company3.id,
      name: 'Sameer Patel',
      email: 'sameer.patel@globalzenith.com',
      canChooseAddress: true,
      canChangeDeliveryTime: false,
      canChangePackaging: true,
      allergens: ['Dairy'],
      dietaryTags: ['Vegan', 'High-Protein'],
    },
  ];

  for (const emp of employeesData) {
    const employee = await prisma.employee.create({
      data: {
        companyId: emp.companyId,
        name: emp.name,
        email: emp.email,
        canChooseAddress: emp.canChooseAddress,
        canChangeDeliveryTime: emp.canChangeDeliveryTime,
        canChangePackaging: emp.canChangePackaging,
        isActive: true,
      },
    });

    // Link Allergens
    for (const aName of emp.allergens) {
      const allergen = allergens[aName];
      if (allergen) {
        await prisma.employeeAllergen.create({
          data: {
            employeeId: employee.id,
            allergenId: allergen.id,
          },
        });
      }
    }

    // Link Dietary Tags
    for (const tName of emp.dietaryTags) {
      const tag = dietaryTags[tName];
      if (tag) {
        await prisma.employeeDietaryTag.create({
          data: {
            employeeId: employee.id,
            dietaryTagId: tag.id,
          },
        });
      }
    }
  }

  // ==========================================
  // 10. PLATFORM SETTINGS
  // ==========================================
  console.log('Seeding Platform Settings...');
  const settings = [
    { key: 'KITCHEN_TIMEZONE', value: 'Asia/Kolkata' },
    { key: 'DEFAULT_CUTOFF_MINUTES', value: '60' },
    { key: 'CURRENCY_CODE', value: 'INR' },
  ];

  for (const s of settings) {
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }

  console.log('--- Foundational Database Seed Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
