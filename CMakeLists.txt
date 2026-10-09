cmake_minimum_required(VERSION 4.1)
project(opengltest)

set(CMAKE_CXX_STANDARD 20)

include(FetchContent)

FetchContent_Declare(
        glfw
        GIT_REPOSITORY https://github.com/glfw/glfw.git
        GIT_TAG 3.4
)
FetchContent_MakeAvailable(glfw)

FetchContent_Declare(
        glm
        GIT_REPOSITORY https://github.com/g-truc/glm.git
        GIT_TAG 1.0.3
)
FetchContent_MakeAvailable(glm)

add_library(glad STATIC
    src/glad.c
)

target_include_directories(glad
        PUBLIC include
)

add_executable(opengltest
        src/main.cpp
        src/App.cpp
        src/Mesh.cpp
        src/Shader.cpp
)

target_link_libraries(opengltest
        PRIVATE glfw
        PRIVATE glm
        PRIVATE glad
)

target_include_directories(opengltest
        PRIVATE include
)
