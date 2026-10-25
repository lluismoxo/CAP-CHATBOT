/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            // Only these origins may embed the chatbot in an iframe.
            // Add any new domain here where you want the widget to work.
            // localhost/127.0.0.1 are for local development of the CAP website.
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://capconsultor.eu https://www.capconsultor.eu https://cap-sigma-two.vercel.app http://localhost:3000 http://127.0.0.1:3000 http://localhost:3001 http://127.0.0.1:3001;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
