#ifndef OPENGLTEST_APP_HPP
#define OPENGLTEST_APP_HPP

#include <glad/glad.h>
#include <GLFW/glfw3.h>

#include "Shader.hpp"
#include "ShaderManager.hpp"

#include <chrono>

class App
{
  public:
    void Init();
    void Run();
    constexpr GLFWwindow* GetWindow() const {return m_window;}

  private:
    void Update();
    void Draw();

    GLFWwindow* m_window;

    unsigned int VBO;
    unsigned int VAO;
    unsigned int EBO;
    ShaderManager* m_shaderManager;
    bool m_isRunning;
    unsigned int hdrFBO;
  unsigned int colorBuffers[2];
};

#endif //OPENGLTEST_APP_HPP