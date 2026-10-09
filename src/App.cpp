#include "App.hpp"

#include <cstdio>
#include <stdexcept>

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

  m_window = glfwCreateWindow(800, 600, "", NULL, NULL);
  if (m_window == NULL)
  {
    glfwTerminate();
  }
  glfwMakeContextCurrent(m_window);

  if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress))
  {
    printf("Failed to initialize GLAD");
  }

  glGenBuffers(1, &VBO);

  m_shader = new Shader("../shaders/vertex.vert", "../shaders/fragment.frag");
  glfwSetFramebufferSizeCallback(m_window, framebuffer_size_callback);
  glfwSetWindowUserPointer(m_window, m_shader);

  GLFWmonitor* monitor = glfwGetPrimaryMonitor();
  const GLFWvidmode* mode = glfwGetVideoMode(monitor);

  glfwSetWindowAttrib(m_window, GLFW_DECORATED, GLFW_FALSE);

  glfwSetWindowPos(m_window, 0, 0);
  glfwSetWindowSize(m_window, mode->width, mode->height);

  glGenVertexArrays(1, &VAO);
  glBindVertexArray(VAO);

  glBindBuffer(GL_ARRAY_BUFFER, VBO);
  glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

  glGenBuffers(1, &EBO);

  glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);
  glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indices), indices, GL_STATIC_DRAW);

  glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);
  glEnableVertexAttribArray(0);
}

void App::Run() {
  m_shader->use();
  m_shader->setVec2("iResolution", 1200, 800);
  while(!glfwWindowShouldClose(m_window))
  {
    Update();
    Draw();
  }

  delete m_shader;

  glfwTerminate();
}

void App::Update() {
  glfwPollEvents();

  m_shader->setFloat("iTime", glfwGetTime());
}

void App::Draw() {

  glClearColor(0.6f, 0.3f, 0.3f, 1.0f);
  glClear(GL_COLOR_BUFFER_BIT);

  glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);
  glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, 0);

  glfwSwapBuffers(m_window);

}