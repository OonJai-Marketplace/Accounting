import {readFile,writeFile} from 'node:fs/promises';
import {icons} from './icons.mjs';
const platform=process.argv[2];
if(platform==='ios'){
 const file='ios/App/App/Info.plist';let xml=await readFile(file,'utf8');
 const keys={NSCameraUsageDescription:'Take photos of documents you choose to scan.',NSPhotoLibraryUsageDescription:'Import document photos you choose.',NSPhotoLibraryAddUsageDescription:'Save a scanned document photo when requested.'};
 xml=xml.replace(/<\/dict>\s*<\/plist>/,Object.entries(keys).filter(([k])=>!xml.includes('<key>'+k+'</key>')).map(([k,v])=>`<key>${k}</key><string>${v}</string>`).join('\n')+'\n</dict></plist>');await writeFile(file,xml);
 await writeFile('ios/App/App/PrivacyInfo.xcprivacy',`<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>NSPrivacyTracking</key><false/><key>NSPrivacyCollectedDataTypes</key><array/><key>NSPrivacyAccessedAPITypes</key><array><dict><key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategoryFileTimestamp</string><key>NSPrivacyAccessedAPITypeReasons</key><array><string>C617.1</string></array></dict><dict><key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategoryUserDefaults</string><key>NSPrivacyAccessedAPITypeReasons</key><array><string>CA92.1</string></array></dict></array></dict></plist>`);
 // Capacitor's generated resource group is synchronized by Xcode; copy privacy declaration into resources explicitly.
 const pbx='ios/App/App.xcodeproj/project.pbxproj';let project=await readFile(pbx,'utf8');
 if(!project.includes('PrivacyInfo.xcprivacy')){
  project=project.replace('/* Begin PBXBuildFile section */','/* Begin PBXBuildFile section */\n\t\tABCDEF0123456789ABCDEF01 /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = ABCDEF0123456789ABCDEF02 /* PrivacyInfo.xcprivacy */; };');
  project=project.replace('/* Begin PBXFileReference section */','/* Begin PBXFileReference section */\n\t\tABCDEF0123456789ABCDEF02 /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };');
  project=project.replace(/(\s+[A-F0-9]{24} \/\* AppDelegate.swift \*\/,)/,'\n\t\t\t\tABCDEF0123456789ABCDEF02 /* PrivacyInfo.xcprivacy */,$1');
  project=project.replace(/(isa = PBXResourcesBuildPhase;[\s\S]*?files = \()/,'$1\n\t\t\t\tABCDEF0123456789ABCDEF01 /* PrivacyInfo.xcprivacy in Resources */,');
  await writeFile(pbx,project);
 }
}else if(platform==='android'){
 const file='android/app/src/main/AndroidManifest.xml';let xml=await readFile(file,'utf8');
 if(!xml.includes('android.hardware.camera'))xml=xml.replace('<application','<uses-feature android:name="android.hardware.camera" android:required="false" />\n    <application');
 // Keep scan files in the app sandbox; external destinations use the OS share sheet.
 xml=xml.replace('android:allowBackup="true"','android:allowBackup="false"');
 await writeFile(file,xml);
}else throw Error('Choose android or ios');
await icons(platform);
console.log('Configured '+platform+' permissions and local data handling.');
