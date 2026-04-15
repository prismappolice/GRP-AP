import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { MapPin, Users, Image, Newspaper, HelpCircle, LogIn, FileText } from 'lucide-react';
import api from '@/lib/api';
// import removed: getAdminHierarchyCounts

const adminServices = [
  {
    icon: Image,
    title: 'Gallery',
    description: 'Manage gallery updates and announcements',
    link: '/admin-gallery',
    color: 'bg-[#7C3AED]'
  },

  {
    icon: Newspaper,
    title: 'Latest News',
    description: 'Manage latest news and announcements',
    link: '/admin-gallery?tab=news',
    color: 'bg-[#F59E0B]'
  },
    {
    icon: FileText,
    title: 'Complaints',
    description: 'View and manage all public complaints',
    link: '/admin-complaints',
    color: 'bg-[#DC2626]'
  },
  {
    icon: HelpCircle,
    title: 'Help Requests',
    description: 'View and manage public help desk requests',
    link: '/admin/help-requests',
    color: 'bg-[#D97706]'
  },
    {
    icon: MapPin,
    title: 'Police Users',
    description: 'View and manage police user credentials',
    link: '/admin/stations',
    color: 'bg-[#16A34A]'
  },
    {
    icon: Users,
    title: 'Public Users',
    description: 'View all registered public users',
    link: '/admin-users',
    color: 'bg-[#0EA5E9]'
  },

];

const AdminDashboardPage = () => {
  const [counts, setCounts] = useState({
    users: 0,
    gallery: 0,
    policeUsers: 0,
    latestNews: 0,
    complaints: 0,
  });

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [usersRes, galleryRes, policeUsersRes, newsRes, complaintsRes] = await Promise.all([
          api.get('/users'),
          api.get('/gallery-items'),
          api.get('/admin/credentials'),
          api.get('/news-items'),
          api.get('/complaints'),
        ]);

        setCounts({
          users: Array.isArray(usersRes.data) ? usersRes.data.length : 0,
          gallery: Array.isArray(galleryRes.data) ? galleryRes.data.length : 0,
          policeUsers: Array.isArray(policeUsersRes.data) ? policeUsersRes.data.length : 0,
          latestNews: Array.isArray(newsRes.data) ? newsRes.data.length : 0,
          complaints: Array.isArray(complaintsRes.data) ? complaintsRes.data.length : 0,
        });
      } catch (error) {
        console.error('Failed to load admin dashboard counts:', error);
      }
    };

    loadCounts();
  }, []);

  const getCountForCard = (title) => {
    switch (title) {
      case 'Public Users':
        return counts.users;
      case 'Gallery':
        return counts.gallery;
      case 'Police Users':
        return counts.policeUsers;
      case 'Latest News':
        return counts.latestNews;
      case 'Complaints':
        return counts.complaints;
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen pt-4 bg-[#F8FAFC] pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4">
          <div className="text-center sm:text-center mb-4 sm:mb-0">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#D97706] mb-2">ADMIN DASHBOARD</p>
            <h1 className="text-4xl sm:text-5xl font-extrabold heading-font text-[#0F172A]">Admin Dashboard</h1>
            <p className="text-lg text-[#475569] mt-4">Manage users, gallery content, and station hierarchy credentials.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {adminServices.map((service, idx) => {
            const Icon = service.icon;
            return (
              <Link key={idx} to={service.link}>
                <Card className="relative p-8 border border-[#E2E8F0] bg-white hover:-translate-y-1 hover:shadow-lg transition-all duration-200 h-full">
                  <div className="absolute top-6 right-6 min-w-10 h-10 px-3 rounded-full bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center text-lg font-extrabold shadow-sm">
                    {getCountForCard(service.title)}
                  </div>
                  <div className={`${service.color} w-14 h-14 rounded-md flex items-center justify-center mb-4`}>
                    <Icon className="w-7 h-7 text-white" strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-bold heading-font text-[#0F172A] mb-2">{service.title}</h3>
                  <p className="text-sm text-[#475569] leading-relaxed">{service.description}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
