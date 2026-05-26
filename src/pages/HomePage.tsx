import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { BookOpen, Share2, Download, Search, ArrowRight, Star, Users, Shield } from 'lucide-react';

export const HomePage = () => {
  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100 dark:bg-indigo-900/20 rounded-full blur-[120px] opacity-50" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-100 dark:bg-purple-900/20 rounded-full blur-[120px] opacity-50" />
        </div>

        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center space-x-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-full text-sm font-bold mb-8">
              <Star className="h-4 w-4 fill-current" />
              <span>The #1 Study Resource for Students</span>
            </span>
            <h1 className="text-6xl md:text-7xl font-black text-gray-900 dark:text-white tracking-tight mb-8">
              Unlock Your Academic <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">Potential Together</span>
            </h1>
            <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-12">
              Share, discover, and download high-quality study notes from top students worldwide. 
              Join our community of 50,000+ learners today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/notes"
                className="w-full sm:w-auto bg-indigo-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 dark:shadow-none flex items-center justify-center space-x-2"
              >
                <span>Browse Notes</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/upload"
                className="w-full sm:w-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-100 dark:border-gray-700 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center space-x-2"
              >
                <Share2 className="h-5 w-5" />
                <span>Share Notes</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white">Why SmartNote?</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-4">Everything you need to excel in your studies</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: <Search className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />,
                title: "Smart Search",
                desc: "Find exactly what you need with our advanced filtering and search system."
              },
              {
                icon: <Download className="h-8 w-8 text-purple-600 dark:text-purple-400" />,
                title: "Instant Downloads",
                desc: "Get your study materials in PDF, PPT, or DOC format with a single click."
              },
              {
                icon: <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />,
                title: "Verified Content",
                desc: "Quality notes reviewed and rated by the student community."
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10 }}
                className="p-8 rounded-3xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 transition-all"
              >
                <div className="bg-white dark:bg-gray-700 w-16 h-16 rounded-2xl shadow-sm flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-indigo-600 dark:bg-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-black mb-2">50K+</div>
              <div className="text-indigo-100">Students</div>
            </div>
            <div>
              <div className="text-4xl font-black mb-2">120K+</div>
              <div className="text-indigo-100">Notes Shared</div>
            </div>
            <div>
              <div className="text-4xl font-black mb-2">15M+</div>
              <div className="text-indigo-100">Downloads</div>
            </div>
            <div>
              <div className="text-4xl font-black mb-2">4.9/5</div>
              <div className="text-indigo-100">User Rating</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
