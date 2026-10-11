

#ifndef OPENGLTEST_UTILS_HPP
#define OPENGLTEST_UTILS_HPP

#include <glad/glad.h>

#include "GLFW/glfw3.h"

#include "Shader.hpp"

inline void framebuffer_size_callback(GLFWwindow* window, int width, int height)
{
  glViewport(0, 0, width, height);
  Shader* shader = (Shader*)glfwGetWindowUserPointer(window);
  shader->setVec2("iResolution", width, height);
}

// diferent impl with different os
bool IsWindowFullyCovered(GLFWwindow* window);
bool SetWindowAsWallpaper(GLFWwindow* window);

bool GetRightArrowPressed();
bool GetLeftArrowPressed();
bool GetRPressed();

#endif //OPENGLTEST_UTILS_HPP