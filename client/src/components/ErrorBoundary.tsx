import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(_: Error): State {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
                    <div className="max-w-md w-full text-center card p-8">
                        <div className="text-4xl mb-4">⚠️</div>
                        <h1 className="text-xl font-bold text-gray-900 mb-2">Nimadir noto'g'ri bajarildi</h1>
                        <p className="text-gray-500 mb-6">Sahifani yangilab ko'ring yoki keyinroq urinib ko'ring.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="btn-primary w-full justify-center"
                        >
                            Sahifani yangilash
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
