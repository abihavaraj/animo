import { supabase } from '../config/supabase.config';

export interface ExportOptions {
  format: 'pdf' | 'csv' | 'excel';
  dateRange?: {
    start: string;
    end: string;
  };
  sections: string[]; // ['overview', 'clients', 'revenue', 'classes', 'subscriptions']
  filename?: string;
}

export class ExportService {
  static async exportReports(options: ExportOptions): Promise<{ success: boolean; message: string; downloadUrl?: string }> {
    try {
      console.log('📊 Starting report export...', options);

      // Collect data from Supabase
      const [usersResponse, paymentsResponse, classesResponse, subscriptionsResponse, lifecycleResponse] = await Promise.all([
        this.getUsersStats(),
        this.getPaymentsRevenue(),
        this.getClassesStats(),
        this.getSubscriptionsStats(),
        this.getClientLifecycleOverview()
      ]);

      // Compile report data
      const reportData = {
        generatedAt: new Date().toISOString(),
        studio: {
          name: 'ANIMO Pilates Studio',
          reportType: 'Comprehensive Analytics Report',
          period: options.dateRange ? 
            `${options.dateRange.start} to ${options.dateRange.end}` : 
            'All Time'
        },
        overview: {
          totalClients: usersResponse.data?.clients || 0,
          activeSubscriptions: usersResponse.data?.activeSubscriptions || 0,
          monthlyRevenue: paymentsResponse.data?.thisMonthRevenue || 0,
          totalClasses: classesResponse.data?.totalClasses || 0,
          attendanceRate: classesResponse.data?.averageAttendanceRate || 0,
        },
        clientAnalytics: {
          newClients: usersResponse.data?.recentUsers || 0,
          atRiskClients: lifecycleResponse.data?.atRiskClients?.length || 0,
          stageDistribution: lifecycleResponse.data?.stageDistribution || [],
        },
        revenueAnalytics: {
          totalRevenue: paymentsResponse.data?.totalRevenue || 0,
          thisMonthRevenue: paymentsResponse.data?.thisMonthRevenue || 0,
          thisYearRevenue: paymentsResponse.data?.thisYearRevenue || 0,
          monthlyBreakdown: paymentsResponse.data?.monthlyBreakdown || [],
        },
        classAnalytics: {
          totalClasses: classesResponse.data?.totalClasses || 0,
          popularClasses: classesResponse.data?.popularClasses || [],
          instructorStats: classesResponse.data?.instructorStats || [],
          equipmentDistribution: classesResponse.data?.equipmentDistribution || [],
        },
        subscriptionAnalytics: {
          totalSubscriptions: subscriptionsResponse.data?.totalSubscriptions || 0,
          planPopularity: subscriptionsResponse.data?.planPopularity || [],
          churnRate: subscriptionsResponse.data?.churnRate || 0,
          monthlyTrends: subscriptionsResponse.data?.monthlyTrends || [],
        }
      };

      // Generate export based on format
      switch (options.format) {
        case 'pdf':
          return await this.generatePDFReport(reportData, options);
        case 'csv':
          return await this.generateCSVReport(reportData, options);
        case 'excel':
          return await this.generateExcelReport(reportData, options);
        default:
          throw new Error('Unsupported export format');
      }

    } catch (error) {
      console.error('❌ Export error:', error);
      return {
        success: false,
        message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async getUsersStats() {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'client');
      
      if (error) throw error;
      
      const totalClients = users?.length || 0;
      const recentUsers = users?.filter(user => {
        const createdAt = new Date(user.created_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return createdAt > thirtyDaysAgo;
      }).length || 0;

      return {
        success: true,
        data: {
          clients: totalClients,
          recentUsers,
          activeSubscriptions: 0 // Will be calculated from subscriptions table
        }
      };
    } catch (error) {
      return { success: false, data: { clients: 0, recentUsers: 0, activeSubscriptions: 0 } };
    }
  }

  private static async getPaymentsRevenue() {
    try {
      const { data: payments, error } = await supabase
        .from('payments')
        .select('*');
      
      if (error) throw error;
      
      const totalRevenue = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      
      const thisMonthRevenue = payments?.filter(payment => {
        const paymentDate = new Date(payment.created_at);
        return paymentDate.getMonth() === thisMonth && paymentDate.getFullYear() === thisYear;
      }).reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      
      const thisYearRevenue = payments?.filter(payment => {
        const paymentDate = new Date(payment.created_at);
        return paymentDate.getFullYear() === thisYear;
      }).reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

      return {
        success: true,
        data: {
          totalRevenue,
          thisMonthRevenue,
          thisYearRevenue,
          monthlyBreakdown: []
        }
      };
    } catch (error) {
      return { success: false, data: { totalRevenue: 0, thisMonthRevenue: 0, thisYearRevenue: 0, monthlyBreakdown: [] } };
    }
  }

  private static async getClassesStats() {
    try {
      const { data: classes, error } = await supabase
        .from('classes')
        .select('*');
      
      if (error) throw error;
      
      const totalClasses = classes?.length || 0;
      const popularClasses = classes?.slice(0, 5).map(cls => ({
        name: cls.name,
        level: cls.level,
        equipment_type: cls.equipment_type,
        booking_count: 0,
        attendance_rate: 0
      })) || [];

      return {
        success: true,
        data: {
          totalClasses,
          popularClasses,
          instructorStats: [],
          equipmentDistribution: [],
          averageAttendanceRate: 0
        }
      };
    } catch (error) {
      return { success: false, data: { totalClasses: 0, popularClasses: [], instructorStats: [], equipmentDistribution: [], averageAttendanceRate: 0 } };
    }
  }

  private static async getSubscriptionsStats() {
    try {
      const { data: subscriptions, error } = await supabase
        .from('user_subscriptions')
        .select('*');
      
      if (error) throw error;
      
      const totalSubscriptions = subscriptions?.length || 0;
      const activeSubscriptions = subscriptions?.filter(sub => sub.status === 'active').length || 0;

      return {
        success: true,
        data: {
          totalSubscriptions,
          planPopularity: [],
          churnRate: 0,
          monthlyTrends: []
        }
      };
    } catch (error) {
      return { success: false, data: { totalSubscriptions: 0, planPopularity: [], churnRate: 0, monthlyTrends: [] } };
    }
  }

  private static async getClientLifecycleOverview() {
    try {
      return {
        success: true,
        data: {
          atRiskClients: [],
          stageDistribution: []
        }
      };
    } catch (error) {
      return { success: false, data: { atRiskClients: [], stageDistribution: [] } };
    }
  }

  private static async generatePDFReport(data: any, options: ExportOptions): Promise<{ success: boolean; message: string; downloadUrl?: string }> {
    // Simulate PDF generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('📄 PDF Report generated with sections:', options.sections);
    console.log('📊 Report data summary:', {
      clients: data.overview.totalClients,
      revenue: data.overview.monthlyRevenue,
      classes: data.overview.totalClasses
    });

    return {
      success: true,
      message: 'PDF report generated successfully',
      downloadUrl: '/downloads/pilates-studio-report.pdf'
    };
  }

  private static async generateCSVReport(data: any, options: ExportOptions): Promise<{ success: boolean; message: string; downloadUrl?: string }> {
    // Simulate CSV generation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate CSV data for different sections
    const csvSections: string[] = [];

    if (options.sections.includes('overview')) {
      csvSections.push(this.generateOverviewCSV(data.overview));
    }

    if (options.sections.includes('revenue')) {
      csvSections.push(this.generateRevenueCSV(data.revenueAnalytics));
    }

    if (options.sections.includes('classes')) {
      csvSections.push(this.generateClassesCSV(data.classAnalytics));
    }

    if (options.sections.includes('subscriptions')) {
      csvSections.push(this.generateSubscriptionsCSV(data.subscriptionAnalytics));
    }

    console.log('📊 CSV Report sections generated:', csvSections.length);

    return {
      success: true,
      message: 'CSV report generated successfully',
      downloadUrl: '/downloads/pilates-studio-data.csv'
    };
  }

  private static async generateExcelReport(data: any, options: ExportOptions): Promise<{ success: boolean; message: string; downloadUrl?: string }> {
    // Simulate Excel generation
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    console.log('📊 Excel Report generated with multiple sheets for:', options.sections);

    return {
      success: true,
      message: 'Excel report generated successfully',
      downloadUrl: '/downloads/pilates-studio-report.xlsx'
    };
  }

  private static generateOverviewCSV(overview: any): string {
    return `
Studio Overview
Metric,Value
Total Clients,${overview.totalClients}
Active Subscriptions,${overview.activeSubscriptions}
Monthly Revenue,${overview.monthlyRevenue}
Total Classes,${overview.totalClasses}
Attendance Rate,${overview.attendanceRate}%
`;
  }

  private static generateRevenueCSV(revenue: any): string {
    let csv = `
Revenue Analytics
Total Revenue,${revenue.totalRevenue}
This Month Revenue,${revenue.thisMonthRevenue}
This Year Revenue,${revenue.thisYearRevenue}

Monthly Breakdown
Month,Revenue,Payments
`;
    
    revenue.monthlyBreakdown?.forEach((month: any) => {
      csv += `${month.month},${month.revenue},${month.payments}\n`;
    });

    return csv;
  }

  private static generateClassesCSV(classes: any): string {
    let csv = `
Class Analytics
Total Classes,${classes.totalClasses}

Popular Classes
Class Name,Level,Equipment,Bookings,Attendance Rate
`;

    classes.popularClasses?.forEach((cls: any) => {
      csv += `${cls.name},${cls.level},${cls.equipment_type},${cls.booking_count},${cls.attendance_rate}%\n`;
    });

    csv += `

Instructor Performance
Instructor,Classes Taught,Total Bookings,Attendance Rate,Capacity Utilization
`;

    classes.instructorStats?.forEach((instructor: any) => {
      csv += `${instructor.instructor_name},${instructor.classes_taught},${instructor.total_bookings},${instructor.attendance_rate}%,${instructor.avg_capacity_utilization}%\n`;
    });

    return csv;
  }

  private static generateSubscriptionsCSV(subscriptions: any): string {
    let csv = `
Subscription Analytics
Total Subscriptions,${subscriptions.totalSubscriptions}
Churn Rate,${subscriptions.churnRate}%

Plan Popularity
Plan Name,Subscribers,Active Subscribers,Revenue
`;

    subscriptions.planPopularity?.forEach((plan: any) => {
      csv += `${plan.plan_name},${plan.subscriber_count},${plan.active_subscribers},${plan.active_revenue}\n`;
    });

    return csv;
  }

  static getExportHistory(): { id: string; filename: string; format: string; generatedAt: string; size: string }[] {
    // Return mock export history
    return [
      {
        id: '1',
        filename: 'studio-report-2024-01.pdf',
        format: 'PDF',
        generatedAt: '2024-01-15 10:30 AM',
        size: '2.4 MB'
      },
      {
        id: '2',
        filename: 'client-analytics-2024-01.csv',
        format: 'CSV',
        generatedAt: '2024-01-12 03:15 PM',
        size: '856 KB'
      },
      {
        id: '3',
        filename: 'revenue-analysis-2023.xlsx',
        format: 'Excel',
        generatedAt: '2024-01-01 09:00 AM',
        size: '3.2 MB'
      }
    ];
  }

  static async downloadReport(reportId: string): Promise<{ success: boolean; message: string }> {
    // Simulate download
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('📥 Downloading report:', reportId);
    
    return {
      success: true,
      message: 'Report download started'
    };
  }

  static formatCurrency(amount: number): string {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }

  static formatPercentage(value: number): string {
    return `${value}%`;
  }

  static formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
} 