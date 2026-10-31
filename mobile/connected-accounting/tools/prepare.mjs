import { readFile, writeFile, readdir, cp, access, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const app=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'), repo=path.resolve(app,'../..');
const exists=async file=>access(file).then(()=>true,()=>false);
const android=path.join(app,'android/app/src/main');
if(await exists(android)){
 const manifest=path.join(android,'AndroidManifest.xml');let s=await readFile(manifest,'utf8');
 s=s.replace('android:allowBackup="true"','android:allowBackup="false"');
 if(!s.includes('oonjai-accounting'))s=s.replace('</activity>','<intent-filter><action android:name="android.intent.action.VIEW"/><category android:name="android.intent.category.DEFAULT"/><category android:name="android.intent.category.BROWSABLE"/><data android:scheme="oonjai-accounting" android:host="scan"/></intent-filter></activity>');
 await writeFile(manifest,s);
 for(const dir of await readdir(path.join(android,'res'))){
  if(dir.startsWith('mipmap-')&&dir!=='mipmap-anydpi-v26')for(const name of ['ic_launcher.png','ic_launcher_round.png','ic_launcher_foreground.png'])await cp(path.join(repo,'assets/app-icons/accounting-512-v1.png'),path.join(android,'res',dir,name));
 }
 await rm(path.join(android,'res/mipmap-anydpi-v26'),{recursive:true,force:true});
}
const ios=path.join(app,'ios/App/App');
if(await exists(ios)){
 const plist=path.join(ios,'Info.plist');let s=await readFile(plist,'utf8');
 if(!s.includes('NSCameraUsageDescription'))s=s.replace('<dict>','<dict><key>NSCameraUsageDescription</key><string>Scan company receipts and supporting documents into your Accounting entries.</string><key>CFBundleURLTypes</key><array><dict><key>CFBundleURLSchemes</key><array><string>oonjai-accounting</string></array></dict></array>');
 await writeFile(plist,s);
 // Xcode tools are only available on the macOS build runner.
 if(process.platform==='darwin')execFileSync('sips',['-z','1024','1024',path.join(repo,'assets/app-icons/accounting-512-v1.png'),'--out',path.join(ios,'Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')],{stdio:'ignore'});
}
console.log('Configured native camera permission, private backup policy, OAuth return and Accounting icons.');
