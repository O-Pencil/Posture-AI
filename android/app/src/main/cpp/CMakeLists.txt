# @file CMakeLists.txt
# @description CMake 3.22.1 配置：构建 posture_ai_bridge 共享库，链接外部 IMPORTED 的 libMNN.so。
#
# [WHO] cmake_minimum_required(3.22.1) + project("posture_ai_bridge") + add_library(posture_ai_bridge SHARED eyes_mnn_bridge.cpp eyes_llm_session.cpp) + add_library(MNN SHARED IMPORTED)
# [FROM] 依赖 `MNN_SOURCE_ROOT` 头文件目录、`jniLibs/${ANDROID_ABI}/libMNN.so`、`log-lib`、`android`
# [TO] 被 `android/app/build.gradle` 的 `externalNativeBuild { cmake { path "src/main/cpp/CMakeLists.txt" } }` 调用
# [HERE] android/app/src/main/cpp/CMakeLists.txt · 原生构建配置
cmake_minimum_required(VERSION 3.22.1)
project("posture_ai_bridge")

# cpp -> main -> src -> app -> android-app -> repo root (5 levels) -> Pencil root (6 levels)
set(MNN_SOURCE_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../../../../../../Template-github/eyes-on-my-phone/MNN-master")
set(MNN_LIB_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../jniLibs/${ANDROID_ABI}")

add_library(posture_ai_bridge SHARED
        eyes_mnn_bridge.cpp
        eyes_llm_session.cpp
)

target_compile_definitions(posture_ai_bridge PRIVATE GIT_COMMIT_ID="eyes-on-phone")

target_link_options(posture_ai_bridge PRIVATE "-Wl,-z,max-page-size=16384")

include_directories(
        "${MNN_SOURCE_ROOT}/include/"
        "${MNN_SOURCE_ROOT}/transformers/llm/engine/include"
        "${MNN_SOURCE_ROOT}/tools/audio/include"
        "${MNN_SOURCE_ROOT}/3rd_party/"
)

add_library(MNN SHARED IMPORTED)
set_target_properties(MNN PROPERTIES IMPORTED_LOCATION "${MNN_LIB_DIR}/libMNN.so")

find_library(log-lib log)

target_link_libraries(posture_ai_bridge
        ${log-lib}
        android
        MNN
)
