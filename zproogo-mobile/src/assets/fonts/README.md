# Fonts (Montserrat + Inter)

Download the static .ttf files from Google Fonts and put these 5 files in THIS folder:

- Montserrat-Bold.ttf
- Montserrat-Medium.ttf
- Inter-Regular.ttf
- Inter-Medium.ttf
- Inter-SemiBold.ttf

Then link them (works for Android + iOS):

    npx react-native-asset
    npm run android

`react-native.config.js` already points at this folder. The names above must match the file names exactly
(they are used as `fontFamily` in `src/theme/typography.ts`).
