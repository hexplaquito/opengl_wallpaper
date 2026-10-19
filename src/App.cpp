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

    // if (SetWindowAsWallpaper(m_window)) {
    //   printf("SetWindowAsWallpaper success");
    // }

  m_isRunning = true;

  glGenFramebuffers(1, &hdrFBO);
  glBindFramebuffer(GL_FRAMEBUFFER, hdrFBO);

  glGenTextures(2, colorBuffers);

  for (unsigned int i = 0; i < 2; i++)
  {
    glBindTexture(GL_TEXTURE_2D, colorBuffers[i]);
    glTexImage2D(
        GL_TEXTURE_2D, 0, GL_RGBA16F, mode->width, mode->height, 0, GL_RGBA, GL_FLOAT, NULL
    );
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
    // attach texture to framebuffer
    glFramebufferTexture2D(
        GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0 + i, GL_TEXTURE_2D, colorBuffers[i], 0
    );
  }
  glBindFramebuffer(GL_FRAMEBUFFER, 0);
}

void App::Run() {

  while(!glfwWindowShouldClose(m_window) && m_isRunning)
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

  if (GetRightArrowPressed() ) {
    m_shaderManager->UseNext();
  }

  if (GetLeftArrowPressed()) {
    m_shaderManager->UsePrevious();
  }

  if (GetRPressed()) {
    m_shaderManager->Reload();
  }

  if (GetSPressed()) {
    m_isRunning = false;
  }

  // pause while not visible -> dependent on os
  while (IsWindowFullyCovered(m_window)) {
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    glfwPollEvents();
  }

}

void App::Draw() {

  // glBindFramebuffer(GL_FRAMEBUFFER, hdrFBO);
  glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

  glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);
  glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, 0);

  // glBindFramebuffer(GL_FRAMEBUFFER, 0);



  glfwSwapBuffers(m_window);

}