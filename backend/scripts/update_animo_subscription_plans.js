const Database = require('../config/database');

async function updateAnimoSubscriptionPlans() {
  try {
    await Database.connect();
    console.log('🔄 Updating ANIMO Pilates Studio subscription plans...\n');

    // Delete existing plans
    console.log('🗑️ Clearing existing subscription plans...');
    await Database.run('DELETE FROM subscription_plans');

    // Create ANIMO Pilates Studio subscription plans
    const animoPlans = [
      // 8 TIMES/MONTH PACKAGES
      {
        name: '8 Classes/Month - 3 Months Package',
        monthly_classes: 8,
        monthly_price: 12500, // Albanian Lek
        equipment_access: 'both',
        description: '8 Pilates classes per month with 3-month commitment. Perfect for beginners and those with busy schedules.',
        category: 'standard',
        duration_months: 3,
        features: JSON.stringify([
          '8 Classes per Month',
          '3-Month Commitment',
          'Mat & Reformer Access',
          'Beginner Friendly',
          'Flexible Scheduling',
          'Equipment Provided'
        ])
      },
      {
        name: '8 Classes/Month - 6 Months Package',
        monthly_classes: 8,
        monthly_price: 11000, // Albanian Lek
        equipment_access: 'both',
        description: '8 Pilates classes per month with 6-month commitment. Great value for consistent practice.',
        category: 'standard',
        duration_months: 6,
        features: JSON.stringify([
          '8 Classes per Month',
          '6-Month Commitment',
          'Mat & Reformer Access',
          'Better Value',
          'Priority Booking',
          'Progress Tracking'
        ])
      },
      {
        name: '8 Classes/Month - 1 Year Package',
        monthly_classes: 8,
        monthly_price: 10000, // Albanian Lek
        equipment_access: 'both',
        description: '8 Pilates classes per month with 1-year commitment. Excellent long-term value.',
        category: 'premium',
        duration_months: 12,
        features: JSON.stringify([
          '8 Classes per Month',
          '1-Year Commitment',
          'Mat & Reformer Access',
          'Best Value',
          'Priority Booking',
          'Free Body Assessment',
          'Workshop Discounts'
        ])
      },
      {
        name: '8 Classes/Month - Yearly Package',
        monthly_classes: 8,
        monthly_price: 8500, // Albanian Lek
        equipment_access: 'both',
        description: '8 Pilates classes per month with yearly commitment. Maximum savings for dedicated practitioners.',
        category: 'premium',
        duration_months: 12,
        features: JSON.stringify([
          '8 Classes per Month',
          'Yearly Commitment',
          'Mat & Reformer Access',
          'Maximum Savings',
          'VIP Priority Booking',
          'Quarterly Body Assessment',
          'Workshop Access Included',
          'Guest Pass Included'
        ])
      },

      // 12 TIMES/MONTH PACKAGES
      {
        name: '12 Classes/Month - 3 Months Package',
        monthly_classes: 12,
        monthly_price: 18000, // Albanian Lek
        equipment_access: 'both',
        description: '12 Pilates classes per month with 3-month commitment. Perfect for serious practitioners.',
        category: 'standard',
        duration_months: 3,
        features: JSON.stringify([
          '12 Classes per Month',
          '3-Month Commitment',
          'Mat & Reformer Access',
          'All Levels Welcome',
          'Flexible Scheduling',
          'Equipment Provided',
          'Progress Tracking'
        ])
      },
      {
        name: '12 Classes/Month - 6 Months Package',
        monthly_classes: 12,
        monthly_price: 16000, // Albanian Lek
        equipment_access: 'both',
        description: '12 Pilates classes per month with 6-month commitment. Great for consistent progress.',
        category: 'premium',
        duration_months: 6,
        features: JSON.stringify([
          '12 Classes per Month',
          '6-Month Commitment',
          'Mat & Reformer Access',
          'Better Value',
          'Priority Booking',
          'Monthly Progress Review',
          'Workshop Discounts (10% off)'
        ])
      },
      {
        name: '12 Classes/Month - 1 Year Package',
        monthly_classes: 12,
        monthly_price: 14000, // Albanian Lek
        equipment_access: 'both',
        description: '12 Pilates classes per month with 1-year commitment. Excellent value for dedicated practice.',
        category: 'premium',
        duration_months: 12,
        features: JSON.stringify([
          '12 Classes per Month',
          '1-Year Commitment',
          'Mat & Reformer Access',
          'Excellent Value',
          'VIP Priority Booking',
          'Quarterly Body Assessment',
          'Workshop Discounts (20% off)',
          'Free Nutrition Consultation'
        ])
      },
      {
        name: '12 Classes/Month - Yearly Package',
        monthly_classes: 12,
        monthly_price: 12500, // Albanian Lek
        equipment_access: 'both',
        description: '12 Pilates classes per month with yearly commitment. Best value for committed practitioners.',
        category: 'premium',
        duration_months: 12,
        features: JSON.stringify([
          '12 Classes per Month',
          'Yearly Commitment',
          'Mat & Reformer Access',
          'Best Value',
          'VIP Priority Booking',
          'Quarterly Body Assessment',
          'Workshop Access Included',
          'Guest Pass Included',
          'Personal Training Discount'
        ])
      },

      // 20 TIMES/MONTH PACKAGES
      {
        name: '20 Classes/Month - 3 Months Package',
        monthly_classes: 20,
        monthly_price: 23000, // Albanian Lek
        equipment_access: 'both',
        description: '20 Pilates classes per month with 3-month commitment. For intensive practice and rapid results.',
        category: 'premium',
        duration_months: 3,
        features: JSON.stringify([
          '20 Classes per Month',
          '3-Month Commitment',
          'Mat & Reformer Access',
          'Intensive Training',
          'All Levels Welcome',
          'Daily Class Access',
          'Equipment Provided',
          'Progress Tracking'
        ])
      },
      {
        name: '20 Classes/Month - 6 Months Package',
        monthly_classes: 20,
        monthly_price: 21000, // Albanian Lek
        equipment_access: 'both',
        description: '20 Pilates classes per month with 6-month commitment. Intensive program for serious transformation.',
        category: 'premium',
        duration_months: 6,
        features: JSON.stringify([
          '20 Classes per Month',
          '6-Month Commitment',
          'Mat & Reformer Access',
          'Intensive Program',
          'VIP Priority Booking',
          'Monthly Progress Review',
          'Workshop Discounts (15% off)',
          'Personal Training Discount'
        ])
      },
      {
        name: '20 Classes/Month - 1 Year Package',
        monthly_classes: 20,
        monthly_price: 18400, // Albanian Lek
        equipment_access: 'both',
        description: '20 Pilates classes per month with 1-year commitment. Ultimate value for transformation journey.',
        category: 'unlimited',
        duration_months: 12,
        features: JSON.stringify([
          '20 Classes per Month',
          '1-Year Commitment',
          'Mat & Reformer Access',
          'Ultimate Value',
          'VIP Priority Booking',
          'Quarterly Body Assessment',
          'Workshop Access Included',
          'Guest Pass Included',
          'Personal Training Discount (20% off)',
          'Nutrition Consultation'
        ])
      },
      {
        name: '20 Classes/Month - Yearly Package',
        monthly_classes: 20,
        monthly_price: 16000, // Albanian Lek
        equipment_access: 'both',
        description: '20 Pilates classes per month with yearly commitment. Maximum savings for ultimate transformation.',
        category: 'unlimited',
        duration_months: 12,
        features: JSON.stringify([
          '20 Classes per Month',
          'Yearly Commitment',
          'Mat & Reformer Access',
          'Maximum Savings',
          'VIP Priority Booking',
          'Quarterly Body Assessment',
          'Workshop Access Included',
          '2 Guest Passes per Month',
          'Personal Training Discount (25% off)',
          'Nutrition Consultation Included',
          'Lifestyle Coaching Access'
        ])
      },

      // TRIAL PACKAGE
      {
        name: 'Trial Package - New Members',
        monthly_classes: 3,
        monthly_price: 3000, // Albanian Lek
        equipment_access: 'both',
        description: 'Perfect introduction to ANIMO Pilates. 3 classes to experience our studio.',
        category: 'trial',
        duration_months: 1,
        features: JSON.stringify([
          '3 Classes Total',
          'Mat & Reformer Access',
          'Beginner-Friendly Only',
          'Free Studio Orientation',
          'Equipment Tutorial',
          'No Long-term Commitment',
          'Upgrade Discount Available'
        ])
      }
    ];

    console.log('✨ Creating ANIMO Pilates Studio subscription plans...');
    
    for (const plan of animoPlans) {
      const result = await Database.run(`
        INSERT INTO subscription_plans (
          name, monthly_classes, monthly_price, equipment_access,
          description, category, features, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
      `, [
        plan.name,
        plan.monthly_classes,
        plan.monthly_price,
        plan.equipment_access,
        plan.description,
        plan.category,
        plan.features
      ]);
      
      console.log(`   ✅ Created: ${plan.name} (ID: ${result.id})`);
    }

    console.log('\n📊 Summary of ANIMO Pilates Studio plans:');
    console.log('   🏷️ Trial: 1 package for new members');
    console.log('   🔸 8 Classes/Month: 4 duration options (3M, 6M, 1Y, Yearly)');
    console.log('   💎 12 Classes/Month: 4 duration options (3M, 6M, 1Y, Yearly)');
    console.log('   🚀 20 Classes/Month: 4 duration options (3M, 6M, 1Y, Yearly)');

    console.log('\n💰 Pricing Overview (Albanian Lek):');
    console.log('   📚 8 Classes: 12,500 → 11,000 → 10,000 → 8,500 ALL');
    console.log('   📚 12 Classes: 18,000 → 16,000 → 14,000 → 12,500 ALL');
    console.log('   📚 20 Classes: 23,000 → 21,000 → 18,400 → 16,000 ALL');
    console.log('   📚 Trial: 3,000 ALL');

    console.log('\n🎯 Key Features:');
    console.log('   ✅ All plans include Mat & Reformer access');
    console.log('   ✅ Progressive pricing for longer commitments');
    console.log('   ✅ VIP benefits for premium packages');
    console.log('   ✅ Workshop access and discounts');
    console.log('   ✅ Personal training discounts');
    console.log('   ✅ Trial package for new members');

    await Database.close();
    console.log('\n✅ ANIMO Pilates Studio subscription plans updated successfully!');

  } catch (error) {
    console.error('❌ Error updating subscription plans:', error);
    if (Database) {
      await Database.close();
    }
  }
}

updateAnimoSubscriptionPlans(); 