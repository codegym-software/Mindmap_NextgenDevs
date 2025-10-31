/**
 * Layout cho các trang Auth (Landing, Login, Register).
 * Hiện tại, UX Flow (Router #1-4) đều trỏ về Dashboard/Editor.
 * Trang này sẽ dùng cho trang Landing Page (/)
 */
import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Header from './Header'; // Dùng chung Header
import Button from '../components/Button/Button';

const AuthLayout: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <Header />
            
            <main className="pt-14">
                {/* Đây là trang Landing Page (Router #1) */}
                <div className="relative isolate overflow-hidden pt-16 sm:pt-24 lg:pt-32">
                    <div className="absolute inset-0 -z-10 h-full w-full bg-gray-950 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]"></div>
                    <div
                        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
                        aria-hidden="true"
                    >
                        <div
                            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#80caff] to-[#4f46e5] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
                            style={{
                                clipPath:
                                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                            }}
                        />
                    </div>
                    
                    <div className="mx-auto max-w-2xl py-16 sm:py-24 text-center">
                        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                            Giải phóng ý tưởng của bạn
                        </h1>
                        <p className="mt-6 text-lg leading-8 text-gray-300">
                            Xây dựng, sắp xếp và chia sẻ sơ đồ tư duy một cách liền mạch. 
                            Tích hợp AI, cộng tác real-time và hỗ trợ guest mode.
                        </p>
                        <div className="mt-10 flex items-center justify-center gap-x-6">
                            <Button
                                size="lg"
                                className="!text-base"
                                onClick={() => navigate('/dashboard')} // Router #1 -> #6
                            >
                                Bắt đầu ngay (Miễn phí)
                            </Button>
                            <a href="#features" className="text-sm font-semibold leading-6 text-gray-300 hover:text-white">
                                Tìm hiểu thêm <span aria-hidden="true">→</span>
                            </a>
                        </div>
                    </div>
                </div>
                
                 {/* Outlet cho các route con (nếu có) */}
                 <Outlet />
            </main>
        </div>
    );
};

export default AuthLayout;
