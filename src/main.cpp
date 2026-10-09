#include <glad/glad.h>
#include <GLFW/glfw3.h>

#include "App.hpp"

#include <iostream>

int main() {
  App app;

  app.Init();

  app.Run();

  return 0;
}