<<<<<<< HEAD
# ASMIRE Ecommerce

A premium unisex clothing ecommerce demo built with Express, Supabase, and eSewa payment integration.

## Project Overview

- Full-stack ecommerce storefront in `public/`
- Express server in `server.js`
- Supabase backend for products and stock management
- eSewa payment flow support

## Features

- Product browsing and search
- Category filtering
- Cart and checkout flow
- Order persistence in `data/orders.json`
- Supabase stock decrement on checkout
- Environment-based configuration

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sakamoto-001/Ecommerce.git
   cd Ecommerce
   ```

2. Install packages:
   ```bash
   npm install
   ```

3. Create a `.env` file in the project root and set these variables:
   ```env
   SUPABASE_URL=
   SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ESEWA_MERCHANT_CODE=EPAYTEST
   ESEWA_SECRET_KEY=8gBm/:&EnhH.1/q
   ESEWA_PAYMENT_URL=https://rc-epay.esewa.com.np/api/epay/main/v2/form
   ESEWA_STATUS_URL=https://rc-epay.esewa.com.np/api/epay/transaction/status/
   PORT=3000
   BASE_URL=http://localhost:3000
   ```

4. Start the app:
   ```bash
   npm start
   ```

5. Open the storefront:
   ```text
   http://localhost:3000
   ```

## Development

- Run in watch mode:
  ```bash
  npm run dev
  ```

## Project Structure

- `server.js` - Express API and payment flow logic
- `public/` - Frontend static files
- `data/orders.json` - Local order store for the checkout flow
- `supabase/` - SQL schema and setup scripts
- `package.json` - Dependencies and scripts

## Notes

- This project requires a Supabase project with a `products` table.
- The checkout flow uses eSewa integration and may require sandbox/test credentials.
- `.gitignore` excludes local artifacts like `node_modules/`, `.env`, and logs.

## GitHub

Repository: https://github.com/sakamoto-001/Ecommerce
=======
# Ecommerce
>>>>>>> 4d6e30cc57f6728eeca64890e2c5b13484e514f7
