const Database = require('../config/database');

async function updateSubscriptionPlans() {
  try {
    await Database.connect();
    console.log('🔄 Updating subscription plans with realistic Pilates packages...\n');

    // Delete existing plans
    console.log('🗑️ Clearing existing subscription plans...');
    await Database.run('DELETE FROM subscription_plans');

    // Create realistic Pilates subscription plans
    const newPlans = [
      // MAT PACKAGES
      {
        name: '1 Month - 2x/Week Mat Package',
        monthly_classes: 8, // 2 classes per week * 4 weeks
        monthly_price: 120,
        equipment_access: 'mat',
        description: 'Perfect for beginners or those with busy schedules. 2 mat classes per week for consistent practice.',
        category: 'basic',
        features: JSON.stringify([
          '8 Mat Classes per Month (2x/week)',
          'Beginner & Intermediate Levels',
          'Online Booking & Cancellation',
          'Access to Class Library',
          'Equipment Provided'
        ])
      },
      {
        name: '1 Month - 3x/Week Mat Package',
        monthly_classes: 12, // 3 classes per week * 4 weeks
        monthly_price: 165,
        equipment_access: 'mat',
        description: 'Great for dedicated practitioners. 3 mat classes per week for noticeable progress.',
        category: 'standard',
        features: JSON.stringify([
          '12 Mat Classes per Month (3x/week)',
          'All Levels Welcome',
          'Priority Booking',
          'Free Body Assessment',
          'Workshop Discounts (20% off)'
        ])
      },
      {
        name: 'Mat Unlimited Monthly',
        monthly_classes: 999,
        monthly_price: 199,
        equipment_access: 'mat',
        description: 'Unlimited mat classes for serious practitioners who want maximum flexibility.',
        category: 'unlimited',
        features: JSON.stringify([
          'Unlimited Mat Classes',
          'All Levels & Specialty Classes',
          'Priority Booking',
          'Free Monthly Body Assessment',
          'Workshop Access Included',
          '2 Guest Passes per Month'
        ])
      },

      // REFORMER PACKAGES
      {
        name: '1 Month - 2x/Week Reformer Package',
        monthly_classes: 8, // 2 classes per week * 4 weeks
        monthly_price: 280,
        equipment_access: 'reformer',
        description: 'Introduction to reformer training. 2 reformer classes per week with personalized attention.',
        category: 'standard',
        features: JSON.stringify([
          '8 Reformer Classes per Month (2x/week)',
          'Small Group Sessions (Max 6 people)',
          'Equipment Orientation Included',
          'Personalized Modifications',
          'Progress Tracking'
        ])
      },
      {
        name: '1 Month - 3x/Week Reformer Package',
        monthly_classes: 12, // 3 classes per week * 4 weeks
        monthly_price: 390,
        equipment_access: 'reformer',
        description: 'Intensive reformer training. 3 reformer classes per week for advanced results.',
        category: 'premium',
        features: JSON.stringify([
          '12 Reformer Classes per Month (3x/week)',
          'Advanced Techniques Training',
          'Small Group Sessions',
          'Monthly Progress Assessment',
          'Workshop Priority Access',
          'Free Nutrition Consultation'
        ])
      },

      // HYBRID PACKAGES
      {
        name: 'Hybrid Package - Mat & Reformer',
        monthly_classes: 10, // Mix of mat and reformer
        monthly_price: 299,
        equipment_access: 'both',
        description: 'Best of both worlds. Mix mat and reformer classes for a well-rounded practice.',
        category: 'premium',
        features: JSON.stringify([
          '10 Classes per Month (Mat + Reformer)',
          'Flexible Class Allocation',
          'All Levels Welcome',
          'Equipment Training',
          'Monthly Body Assessment',
          'Workshop Discounts (25% off)'
        ])
      },

      // PERSONAL PACKAGES
      {
        name: 'Personal Training - 4 Sessions',
        monthly_classes: 4,
        monthly_price: 480, // $120 per session
        equipment_access: 'both',
        description: 'One-on-one personal training sessions. Fully customized workouts with dedicated instructor.',
        category: 'personal',
        features: JSON.stringify([
          '4 Private Sessions per Month',
          'Customized Workout Plans',
          'Mat & Reformer Access',
          'Detailed Progress Tracking',
          'Nutrition & Lifestyle Guidance',
          'Injury Prevention Focus'
        ])
      },
      {
        name: 'Personal Training - 8 Sessions',
        monthly_classes: 8,
        monthly_price: 880, // $110 per session (bulk discount)
        equipment_access: 'both',
        description: 'Intensive personal training program. 8 private sessions for rapid progress and transformation.',
        category: 'personal',
        features: JSON.stringify([
          '8 Private Sessions per Month',
          'Comprehensive Fitness Assessment',
          'Custom Exercise Programs',
          'Mat & Reformer Training',
          'Weekly Progress Reviews',
          'Nutritional Meal Planning',
          'Lifestyle Coaching'
        ])
      },

      // FAMILY/SPECIAL PACKAGES
      {
        name: 'Duo Package - 2 People',
        monthly_classes: 12, // 6 sessions each
        monthly_price: 299,
        equipment_access: 'mat',
        description: 'Perfect for couples or friends. Share 12 mat classes between 2 people.',
        category: 'special',
        features: JSON.stringify([
          '12 Shared Mat Classes',
          'Flexible Scheduling',
          'Partner Workouts Available',
          'Buddy Motivation System',
          'Group Class Access',
          'Special Event Invitations'
        ])
      },

      // TRIAL/INTRO PACKAGES
      {
        name: 'Trial Package - New Members',
        monthly_classes: 3,
        monthly_price: 49,
        equipment_access: 'mat',
        description: 'Perfect introduction to Pilates. 3 classes to experience our studio.',
        category: 'trial',
        features: JSON.stringify([
          '3 Mat Classes',
          'Beginner-Friendly Only',
          'Free Studio Orientation',
          'Basic Equipment Tutorial',
          'No Long-term Commitment',
          'Upgrade Discount Available'
        ])
      }
    ];

    console.log('✨ Creating new subscription plans...');
    
    for (const plan of newPlans) {
      const result = await Database.run(`
        INSERT INTO subscription_plans (
          name, monthly_classes, monthly_price, equipment_access,
          description, category, features, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
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

    console.log('\n📊 Summary of new subscription plans:');
    console.log('   🏷️ Trial: 1 package for new members');
    console.log('   📚 Basic: 1 package (2x/week mat)');
    console.log('   🔸 Standard: 2 packages (3x/week mat, 2x/week reformer)');
    console.log('   💎 Premium: 2 packages (3x/week reformer, hybrid)');
    console.log('   🔄 Unlimited: 1 package (mat unlimited)');
    console.log('   👤 Personal: 2 packages (4 & 8 sessions)');
    console.log('   👥 Special: 1 package (duo package)');

    console.log('\n🎯 Key Features:');
    console.log('   ✅ Realistic weekly frequency (2x, 3x per week)');
    console.log('   ✅ Progressive pricing structure');
    console.log('   ✅ Equipment-specific options');
    console.log('   ✅ Personal training packages');
    console.log('   ✅ Trial packages for new members');
    console.log('   ✅ Special duo/family options');

    await Database.close();
    console.log('\n✅ Subscription plans updated successfully!');

  } catch (error) {
    console.error('❌ Error updating subscription plans:', error);
    if (Database) {
      await Database.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  updateSubscriptionPlans();
}

module.exports = updateSubscriptionPlans; 