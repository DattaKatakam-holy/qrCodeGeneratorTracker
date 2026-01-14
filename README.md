# Holy QR Code Generator

A modern web-based QR code generator with scan tracking capabilities. Generate QR codes with custom logos and track how many times they've been scanned.

## 🚀 Features

- **Custom QR Code Generation** with multiple size and error correction options
- **Logo Integration** - Use default logos or upload your own
- **Scan Tracking** - Monitor how many times your QR codes are scanned
- **Real-time Analytics** - See scan counts, creation dates, and last scan times
- **Responsive Design** - Works perfectly on desktop and mobile devices
- **Download & Share** - Save QR codes as PNG images or copy trackable links
- **Recent History** - View and reload previously generated QR codes

## 📱 How It Works

1. **Generate QR Code** - Enter your text/URL and select a logo
2. **Unique Tracking** - Each QR code gets a unique ID stored in Firebase
3. **Scan & Redirect** - When scanned, it increments the counter and redirects to your content
4. **Analytics** - View real-time scan statistics in your dashboard

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **QR Generation**: qrcode.js library
- **Database**: Firebase Realtime Database
- **Hosting**: GitHub Pages
- **Icons**: Font Awesome

## 📦 Setup & Deployment

### 1. Firebase Configuration
Your Firebase project is already configured:
- Project: `dynamic-qr-code-generato-9d566`
- Database: Europe West 1 region

### 2. GitHub Pages Deployment
1. Push all files in the `src` folder to your GitHub repository
2. Go to repository Settings > Pages
3. Set source to "Deploy from a branch"
4. Select `main` branch and `/ (root)` folder
5. Your site will be available at: `https://yourusername.github.io/repository-name/`

### 3. Database Security Rules
Set these rules in Firebase Console > Realtime Database > Rules:

```json
{
  "rules": {
    "qr-codes": {
      ".read": true,
      ".write": true,
      "$qrId": {
        ".validate": "newData.hasChildren(['originalText', 'scanCount', 'createdAt'])",
        "scanCount": {
          ".validate": "newData.isNumber() && newData.val() >= 0"
        },
        "originalText": {
          ".validate": "newData.isString()"
        }
      }
    }
  }
}
```

## 📁 Project Structure

```
src/
├── index.html              # Main QR generator page
├── redirect.html           # Scan tracking/redirect page
├── css/
│   └── styles.css          # Main stylesheet
├── js/
│   ├── firebase-config.js  # Firebase configuration
│   ├── qr-generator.js     # Main QR generation logic
│   └── redirect.js         # Redirect/tracking logic
├── assets/
│   ├── holyLogo.png        # Default logo 1
│   └── websiteLogo.png     # Default logo 2
└── README.md               # This file
```

## 🎯 Usage

### Generating QR Codes
1. Enter your meeting link or text in the input field
2. Choose a logo (default options or upload custom)
3. Adjust size and error correction settings
4. Click "Generate QR Code"
5. Download as PNG or copy the trackable link

### Tracking Scans
- Each QR code automatically tracks scan counts
- View analytics in real-time on the main page
- Scan history shows creation date and last scan time

### Meeting Link Example
```
Input: https://meet.google.com/abc-defg-hij
Generated QR: https://yourusername.github.io/qr-generator/redirect.html?id=unique123
```

When someone scans the QR:
1. They visit the redirect URL
2. Scan count increments in Firebase
3. They're redirected to your actual meeting link

## 🔧 Customization

### Adding New Default Logos
1. Add logo files to `assets/` folder
2. Update the HTML in `index.html`:
```html
<div class="logo-option" data-logo="assets/newlogo.png">
    <img src="assets/newlogo.png" alt="New Logo" class="logo-preview">
    <span>New Logo</span>
</div>
```

### Styling Changes
- Modify `css/styles.css` for visual customization
- Update colors, fonts, and layout as needed
- All styles are responsive and mobile-friendly

## 📊 Firebase Database Structure

```json
{
  "qr-codes": {
    "unique123": {
      "id": "unique123",
      "originalText": "https://meet.google.com/abc-defg-hij",
      "logoPath": "assets/holyLogo.png",
      "scanCount": 42,
      "createdAt": 1673598123456,
      "lastScanned": 1673598234567
    }
  }
}
```

## 🚀 Going Live

1. **Update GitHub Pages URL** in `firebase-config.js`:
   ```javascript
   // Update this with your actual GitHub Pages URL
   const baseUrl = 'https://yourusername.github.io/repository-name/';
   ```

2. **Test the complete flow**:
   - Generate a QR code
   - Scan it with your phone
   - Verify the redirect works and count increments

3. **Share your QR codes** with confidence knowing you can track engagement!

## 🎉 You're Ready!

Your Holy QR code generator is now ready to use. Generate trackable QR codes for your meeting links and monitor engagement in real-time!

---
*Built with ❤️ using Firebase and GitHub Pages*