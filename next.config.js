/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            // Permite incrustar el chatbot vía iframe solo en estos dominios.
            // Añade aquí cualquier dominio nuevo donde quieras embeber el widget.
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://capconsultor.eu https://www.capconsultor.eu;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
