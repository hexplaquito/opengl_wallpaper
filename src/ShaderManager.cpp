#include "ShaderManager.hpp"
#include <filesystem>
#include <GLFW/glfw3.h>

ShaderManager::ShaderManager() {
  namespace fs = std::filesystem;

  fs::path folder = "../shaders";

  std::vector<std::string> fragment_names;

  for (const auto& entry : fs::directory_iterator(folder))
  {
    if (entry.is_regular_file())
    {
      if (entry.path().extension() == ".frag") {
        fragment_names.push_back(entry.path().string());
      }
    }
  }

  for (const auto& name: fragment_names) {
    std::cout << name << std::endl;
    if (name == "../shaders\\fragment.frag") {
      continue;
    }
    m_shaders.push_back(new Shader("../shaders/vertex.vert", name.c_str()));
  }

  m_currentShader = -1;
  UseNext();
}

// unload
ShaderManager::~ShaderManager() {
  for (auto shader : m_shaders) {
    delete shader;
  }
}

Shader *ShaderManager::GetCurrent() {
  return m_current;
}

void ShaderManager::UseNext() {

  m_currentShader = m_currentShader + 1;
  if (m_currentShader >= m_shaders.size()) {
    m_currentShader = 0;
  }

  auto s = m_shaders.at(m_currentShader);
  UseShader(s);

}
void ShaderManager::UsePrevious() {

  m_currentShader = m_currentShader - 1;
  if (m_currentShader < 0) {
    m_currentShader = m_shaders.size() - 1;
  }

  auto s = m_shaders.at(m_currentShader);
  UseShader(s);
}

// reload only fragment.frag
void ShaderManager::Reload() {
  static Shader* fragShader;
  if (fragShader != nullptr) {
    delete fragShader;
  }
  fragShader = new Shader("../shaders/vertex.vert", "../shaders/fragment.frag");
  UseShader(fragShader);
}

void ShaderManager::UseShader(Shader *shader) {
  shader->use();
  GLFWmonitor* monitor = glfwGetPrimaryMonitor();
  const GLFWvidmode* mode = glfwGetVideoMode(monitor);
  shader->setVec2("iResolution", mode->width, mode->height);
  m_current = shader;
}