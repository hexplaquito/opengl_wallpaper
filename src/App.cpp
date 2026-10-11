#include "App.hpp"

#include <cstdio>
#include <stdexcept>
#include <thread>

#include "Utils.hpp"

float vertices[] = {
  1.0f,  1.0f, 0.0f,  // top right
  1.0f, -1.0f, 0.0f,  // bottom right
 -1.0f, -1.0f, 0.0f,  // bottom left
 -1.0f,  1.0f, 0.0f   // top left
};
unsigned int indices[] = {  // note that we start from 0!
  0, 1, 3,   // first triangle
  1, 2, 3    // second triangle
};
void App::Init() {

  glfwInit();
  glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
  glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
  glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
  glfwWindowHint(GLFW_DECORATED, GLFW_FALSE);

  GLFWmonitor* monitor = glfwGetPrimaryMonitor();
  const GLFWvidmode* mode = glfwGetVideoMode(monitor);
  m_window = glfwCreateWindow( mode->width, mode->height, "", NULL, NULL);

  if (m_window == NULL)
  {
    glfwTerminate();
  }
  glfwSetWindowPos(m_window, 0, 0);
  glfwMakeContextCurrent(m_window);

  if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress))
  {
    printf("Failed to initialize GLAD");
  }

  m_shaderManager = new ShaderManager();

  glViewport(0, 0, mode->width, mode->height);

  glGenBuffers(1, &VBO);
  glGenBuffers(1, &EBO);
  glGenVertexArrays(1, &VAO);
  glBindVertexArray(VAO);

  glBindBuffer(GL_ARRAY_BUFFER, VBO);
  glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

  glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);
  glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indices), indices, GL_STATIC_DRAW);

  glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);
  glEnableVertexAttribArray(0);

  if (SetWindowAsWallpaper(m_window)) {
    printf("SetWindowAsWallpaper success");
  }
}

void App::Run() {

  while(!glfwWindowShouldClose(m_window))
  {
    Update();
    Draw();
  }
  delete m_shaderManager;

  glfwTerminate();
}

void App::Update() {
  glfwPollEvents();

  m_shaderManager->GetCurrent()->setFloat("iTime", glfwGetTime());

  if (GetRightArrowPressed()) {
    m_shaderManager->UseNext();
  }

  if (GetLeftArrowPressed()) {
    m_shaderManager->UsePrevious();
  }

  if (GetRPressed()) {
    m_shaderManager->Reload();
  }

  // pause while not visible -> dependent on os
  while (IsWindowFullyCovered(m_window)) {
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    glfwPollEvents();
  }

}

void App::Draw() {

  glClear(GL_COLOR_BUFFER_BIT);

  glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);
  glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, 0);

  glfwSwapBuffers(m_window);

}