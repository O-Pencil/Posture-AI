require 'json'
package = JSON.parse(File.read(File.join(__dir__, '..', '..', 'package.json')))

# 端侧 Qwen+MNN 推理 iOS 桥。编译本模块 + 与安卓共享的 C++ 推理核（排除 JNI 专属文件），链接 MNN 静态库。
# 先用 scripts/build-mnn-ios.sh 产出 MNN 库与头文件到 ios/CatuneMnn/MNN/。详见 docs/iOS适配评估与计划.md。
Pod::Spec.new do |s|
  s.name         = 'CatuneMnn'
  s.version      = package['version'] || '1.0.0'
  s.summary      = '端侧 Qwen+MNN 推理 iOS 桥（复用安卓 C++ 核）'
  s.homepage     = 'https://github.com/O-Pencil/Posture-AI'
  s.license      = { :type => 'MIT' }
  s.author       = 'Catune'
  s.platforms    = { :ios => '15.1' }
  s.source       = { :path => '.' }

  # 本模块 .mm/.h + 共享 C++ 核（与安卓同一份；**排除** JNI 专属的 eyes_mnn_bridge.cpp）
  s.source_files = [
    'CatuneMnn.{h,mm}',
    '../../android/app/src/main/cpp/eyes_llm_session.{h,cpp}',
    '../../android/app/src/main/cpp/eyes_log.h',
    '../../android/app/src/main/cpp/llm_stream_buffer.hpp',
    '../../android/app/src/main/cpp/utf8_stream_processor.hpp',
  ]

  # MNN 静态库（device arm64；同/双架构请改 xcframework）。由 build-mnn-ios.sh 放到 MNN/lib/。
  s.vendored_libraries = 'MNN/lib/*.a'

  # MNN 头文件目录与安卓 CMakeLists 完全一致（指向同一份 MNN 源码 third_party/MNN，本地存在即可）。
  mnn = '$(PODS_TARGET_SRCROOT)/../../android/app/src/main/cpp/third_party/MNN'
  cpp = '$(PODS_TARGET_SRCROOT)/../../android/app/src/main/cpp'
  s.pod_target_xcconfig = {
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17',
    'CLANG_CXX_LIBRARY' => 'libc++',
    'HEADER_SEARCH_PATHS' => [
      "\"#{cpp}\"",
      "\"#{mnn}/include\"",
      "\"#{mnn}/transformers/llm/engine/include\"",
      "\"#{mnn}/tools/audio/include\"",
      "\"#{mnn}/3rd_party\"",
    ].join(' '),
  }

  s.dependency 'React-Core'
end
