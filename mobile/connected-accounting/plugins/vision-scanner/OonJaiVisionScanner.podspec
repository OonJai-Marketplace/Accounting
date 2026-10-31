Pod::Spec.new do |s|
  s.name = 'OonJaiVisionScanner'
  s.version = '1.0.0'
  s.summary = 'Apple document scanning for connected Oon Jai Accounting'
  s.homepage = 'https://github.com/OonJai-Marketplace/Accounting'
  s.license = { :type => 'Proprietary' }
  s.author = 'Oon Jai'
  s.source = { :git => 'https://github.com/OonJai-Marketplace/Accounting.git', :tag => s.version.to_s }
  s.source_files = 'ios/Sources/**/*.{swift,h,m}'
  s.ios.deployment_target = '15.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.9'
end
