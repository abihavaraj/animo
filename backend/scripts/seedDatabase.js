const bcrypt = require('bcryptjs');
const moment = require('moment');
const db = require('../config/database');

const seedDatabase = async () => {
  try {
    await db.connect();
    console.log('🌱 Starting database seeding...');

    // Clear existing data (be careful in production!)
    await db.run('DELETE FROM payments');
    await db.run('DELETE FROM waitlist');
    await db.run('DELETE FROM bookings');
    await db.run('DELETE FROM classes');
    await db.run('DELETE FROM user_subscriptions');
    await db.run('DELETE FROM subscription_plans');
    await db.run('DELETE FROM users');

    // Reset auto-increment counters
    await db.run('DELETE FROM sqlite_sequence');

    // 1. Create Users
    console.log('👤 Creating users...');
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Admin
    await db.run(`
      INSERT INTO users (name, email, password, role, phone, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, ['Admin User', 'admin@pilatesstudio.com', hashedPassword, 'admin', '+1-555-0001', 'active']);

    // Instructors
    const instructors = [
      ['Sarah Wilson', 'sarah@pilatesstudio.com', '+1-555-0101'],
      ['Michael Chen', 'michael@pilatesstudio.com', '+1-555-0102'],
      ['Emily Rodriguez', 'emily@pilatesstudio.com', '+1-555-0103']
    ];

    for (const [name, email, phone] of instructors) {
      await db.run(`
        INSERT INTO users (name, email, password, role, phone, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [name, email, hashedPassword, 'instructor', phone, 'active']);
    }

    // Clients
    const clients = [
      ['Jennifer Smith', 'jennifer@example.com', '+1-555-0201', 'Jennifer\'s Sister: +1-555-0301', 'Lower back issues'],
      ['David Johnson', 'david@example.com', '+1-555-0202', 'Mary Johnson: +1-555-0302', null],
      ['Lisa Brown', 'lisa@example.com', '+1-555-0203', 'Tom Brown: +1-555-0303', 'Knee injury recovery'],
      ['Robert Davis', 'robert@example.com', '+1-555-0204', 'Susan Davis: +1-555-0304', null],
      ['Maria Garcia', 'maria@example.com', '+1-555-0205', 'Carlos Garcia: +1-555-0305', 'Pregnancy (second trimester)'],
      ['James Wilson', 'james@example.com', '+1-555-0206', 'Linda Wilson: +1-555-0306', null],
      ['Ashley Taylor', 'ashley@example.com', '+1-555-0207', 'Mark Taylor: +1-555-0307', 'Chronic pain'],
      ['Christopher Lee', 'chris@example.com', '+1-555-0208', 'Sarah Lee: +1-555-0308', null],
      ['Amanda White', 'amanda@example.com', '+1-555-0209', 'John White: +1-555-0309', 'Scoliosis'],
      ['Daniel Martinez', 'daniel@example.com', '+1-555-0210', 'Rosa Martinez: +1-555-0310', null]
    ];

    for (const [name, email, phone, emergency, medical] of clients) {
      await db.run(`
        INSERT INTO users (name, email, password, role, phone, emergency_contact, medical_conditions, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [name, email, hashedPassword, 'client', phone, emergency, medical, 'active']);
    }

    // 2. Create Subscription Plans
    console.log('📋 Creating subscription plans...');
    
    const plans = [
      {
        name: 'Mat Starter',
        monthly_classes: 4,
        monthly_price: 89.00,
        equipment_access: 'mat',
        category: 'group',
        description: 'Perfect for beginners starting their Pilates journey with mat work.',
        features: ['4 Mat Classes per Month', 'Beginner-Friendly', 'Basic Equipment Access', 'Online Class Library']
      },
      {
        name: 'Mat Unlimited',
        monthly_classes: 999,
        monthly_price: 149.00,
        equipment_access: 'mat',
        category: 'group',
        description: 'Unlimited access to all mat classes for dedicated practitioners.',
        features: ['Unlimited Mat Classes', 'All Levels Welcome', 'Priority Booking', 'Online Class Library', 'Workshop Discounts']
      },
      {
        name: 'Reformer Basic',
        monthly_classes: 8,
        monthly_price: 189.00,
        equipment_access: 'reformer',
        category: 'group',
        description: 'Introduction to reformer work with professional guidance.',
        features: ['8 Reformer Classes per Month', 'Equipment Instruction', 'Small Group Sessions', 'Personalized Attention']
      },
      {
        name: 'Reformer Premium',
        monthly_classes: 16,
        monthly_price: 299.00,
        equipment_access: 'reformer',
        category: 'group',
        description: 'Comprehensive reformer training for serious practitioners.',
        features: ['16 Reformer Classes per Month', 'Advanced Techniques', 'Priority Booking', 'Equipment Maintenance Included', 'Guest Pass']
      },
      {
        name: 'Personal Training',
        monthly_classes: 4,
        monthly_price: 399.00,
        equipment_access: 'both',
        category: 'personal',
        description: 'One-on-one personal training sessions.',
        features: ['4 Personal Sessions per Month', 'Customized Workout Plans', 'Mat & Reformer Access', 'Progress Tracking']
      },
      {
        name: 'Personal Duo',
        monthly_classes: 8,
        monthly_price: 299.00,
        equipment_access: 'both',
        category: 'personal_duo',
        description: 'Semi-private sessions for two people.',
        features: ['8 Duo Sessions per Month', 'Partner Training', 'Mat & Reformer Access', 'Shared Progress Tracking']
      },
      {
        name: 'Full Access Premium',
        monthly_classes: 999,
        monthly_price: 499.00,
        equipment_access: 'both',
        category: 'group',
        description: 'The ultimate Pilates experience with unlimited access to everything.',
        features: ['Unlimited Classes', 'Mat & Reformer Access', 'Private Session Discount', 'Workshop Included', '2 Guest Passes', 'Nutrition Consultation']
      }
    ];

    for (const plan of plans) {
      await db.run(`
        INSERT INTO subscription_plans (name, monthly_classes, monthly_price, equipment_access, category, description, features)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [plan.name, plan.monthly_classes, plan.monthly_price, plan.equipment_access, plan.category, plan.description, JSON.stringify(plan.features)]);
    }

    // 3. Create User Subscriptions (for some clients)
    console.log('💳 Creating user subscriptions...');
    
    const subscriptions = [
      { user_id: 5, plan_id: 1, remaining_classes: 3 }, // Jennifer - Mat Starter
      { user_id: 6, plan_id: 3, remaining_classes: 6 }, // David - Reformer Basic
      { user_id: 7, plan_id: 5, remaining_classes: 15 }, // Lisa - Full Access
      { user_id: 8, plan_id: 2, remaining_classes: 999 }, // Robert - Mat Unlimited
      { user_id: 9, plan_id: 4, remaining_classes: 12 }, // Maria - Reformer Premium
      { user_id: 10, plan_id: 6, remaining_classes: 999 }, // James - Ultimate Unlimited
      { user_id: 11, plan_id: 1, remaining_classes: 2 }, // Ashley - Mat Starter
      { user_id: 12, plan_id: 3, remaining_classes: 7 } // Christopher - Reformer Basic
    ];

    const startDate = moment().format('YYYY-MM-DD');
    const endDate = moment().add(1, 'month').format('YYYY-MM-DD');

    for (const sub of subscriptions) {
      const result = await db.run(`
        INSERT INTO user_subscriptions (user_id, plan_id, remaining_classes, start_date, end_date, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [sub.user_id, sub.plan_id, sub.remaining_classes, startDate, endDate, 'active']);

      // Create corresponding payment
      const plan = await db.get('SELECT monthly_price FROM subscription_plans WHERE id = ?', [sub.plan_id]);
      await db.run(`
        INSERT INTO payments (user_id, subscription_id, amount, payment_date, payment_method, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [sub.user_id, result.id, plan.monthly_price, startDate, 'card', 'completed']);
    }

    // 4. Create Classes
    console.log('🏃‍♀️ Creating classes...');
    
    const classTemplates = [
      { name: 'Morning Mat Flow', level: 'Beginner', equipment_type: 'mat', duration: 60, capacity: 15, instructor_id: 2 },
      { name: 'Power Mat', level: 'Intermediate', equipment_type: 'mat', duration: 45, capacity: 12, instructor_id: 3 },
      { name: 'Advanced Mat Challenge', level: 'Advanced', equipment_type: 'mat', duration: 60, capacity: 10, instructor_id: 4 },
      { name: 'Reformer Basics', level: 'Beginner', equipment_type: 'reformer', duration: 50, capacity: 8, instructor_id: 2 },
      { name: 'Reformer Flow', level: 'Intermediate', equipment_type: 'reformer', duration: 60, capacity: 6, instructor_id: 3 },
      { name: 'Advanced Reformer', level: 'Advanced', equipment_type: 'reformer', duration: 60, capacity: 6, instructor_id: 4 },
      { name: 'Gentle Restoration', level: 'Beginner', equipment_type: 'mat', duration: 45, capacity: 12, instructor_id: 2 },
      { name: 'Core Intensive', level: 'Intermediate', equipment_type: 'both', duration: 50, capacity: 10, instructor_id: 3 }
    ];

    const times = ['06:00', '07:30', '09:00', '10:30', '12:00', '17:00', '18:30', '19:30'];
    
    // Create classes for the next 14 days
    for (let day = 0; day < 14; day++) {
      const date = moment().add(day, 'days').format('YYYY-MM-DD');
      
      // Skip Sundays
      if (moment(date).day() === 0) continue;
      
      const classesPerDay = day < 7 ? 4 : 3; // More classes in the first week
      
      for (let i = 0; i < classesPerDay; i++) {
        const template = classTemplates[Math.floor(Math.random() * classTemplates.length)];
        const time = times[i * 2]; // Spread classes throughout the day
        
        const equipment = template.equipment_type === 'both' 
          ? ['Mat', 'Reformer', 'Magic Circle', 'Resistance Bands']
          : template.equipment_type === 'reformer'
          ? ['Reformer', 'Spring Tension System', 'Reformer Box']
          : ['Mat', 'Magic Circle', 'Resistance Bands', 'Foam Roller'];
        
        await db.run(`
          INSERT INTO classes (name, instructor_id, date, time, duration, level, capacity, equipment_type, equipment, description, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          template.name,
          template.instructor_id,
          date,
          time,
          template.duration,
          template.level,
          template.capacity,
          template.equipment_type,
          JSON.stringify(equipment),
          `A ${template.level.toLowerCase()} level ${template.equipment_type} class focusing on strength, flexibility, and mind-body connection.`,
          'active'
        ]);
      }
    }

    // 5. Create Some Bookings
    console.log('📅 Creating bookings...');
    
    // Get some classes from tomorrow onwards
    const tomorrow = moment().add(1, 'day').format('YYYY-MM-DD');
    const upcomingClasses = await db.all(`
      SELECT id, date, equipment_type, capacity 
      FROM classes 
      WHERE date >= ? 
      ORDER BY date, time 
      LIMIT 20
    `, [tomorrow]);

    // Get users with active subscriptions
    const subscribedUsers = await db.all(`
      SELECT 
        us.user_id, 
        us.id as subscription_id, 
        us.remaining_classes,
        sp.equipment_access
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.status = 'active'
    `);

    let bookingCount = 0;
    for (const class_ of upcomingClasses) {
      // Random number of bookings per class (1-5)
      const numBookings = Math.floor(Math.random() * 5) + 1;
      
      for (let i = 0; i < numBookings && i < class_.capacity; i++) {
        // Pick a random subscribed user who can access this equipment type
        const eligibleUsers = subscribedUsers.filter(user => 
          user.remaining_classes > 0 && 
          (user.equipment_access === 'both' || 
           user.equipment_access === class_.equipment_type)
        );
        
        if (eligibleUsers.length === 0) continue;
        
        const user = eligibleUsers[Math.floor(Math.random() * eligibleUsers.length)];
        
        // Check if user already booked this class
        const existingBooking = await db.get(
          'SELECT id FROM bookings WHERE user_id = ? AND class_id = ?',
          [user.user_id, class_.id]
        );
        
        if (existingBooking) continue;
        
        // Create booking
        await db.run(`
          INSERT INTO bookings (user_id, class_id, subscription_id, status)
          VALUES (?, ?, ?, ?)
        `, [user.user_id, class_.id, user.subscription_id, 'confirmed']);
        
        // Update subscription remaining classes
        await db.run(
          'UPDATE user_subscriptions SET remaining_classes = remaining_classes - 1 WHERE id = ?',
          [user.subscription_id]
        );
        
        // Update class enrollment
        await db.run(
          'UPDATE classes SET enrolled = enrolled + 1 WHERE id = ?',
          [class_.id]
        );
        
        // Update local tracking
        const userIndex = subscribedUsers.findIndex(u => u.user_id === user.user_id);
        subscribedUsers[userIndex].remaining_classes--;
        
        bookingCount++;
      }
    }

    console.log('✅ Database seeding completed successfully!');
    console.log(`
📊 Seeding Summary:
   👤 Users: 14 (1 admin, 3 instructors, 10 clients)
   📋 Subscription Plans: 6
   💳 Active Subscriptions: 8
   🏃‍♀️ Classes: ${upcomingClasses.length} (next 14 days)
   📅 Bookings: ${bookingCount}
   💰 Payments: 8
    `);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await db.close();
  }
};

// Run the seeding
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase; 