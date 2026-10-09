#ifndef OPENGLTEST_APP_HPP
#define OPENGLTEST_APP_HPP

#include <glad/glad.h>
#include <GLFW/glfw3.h>

#include "Shader.hpp"

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

    Shader* m_shader;
};

#endif //OPENGLTEST_APP_HPP