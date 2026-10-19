#ifndef OPENGLTEST_SHADER_HPP
#define OPENGLTEST_SHADER_HPP

#include <glad/glad.h>

#include <string>
#include <fstream>
#include <sstream>
#include <iostream>

enum Channel {
    none = 0,
    texture = 1,
    bufferA = 2,
    bufferB = 3,
    bufferC = 5,
};

class Shader
{
public:
    unsigned int ID;

    Shader(const char* vertexPath, const char* fragmentPath, Channel ic0, Channel ic1, Channel ic2, std::string bA, std::string bB, std::string bC);
    // activate the shader
    // ------------------------------------------------------------------------
    void use();
    // utility uniform functions
    // ------------------------------------------------------------------------
    void setBool(const std::string &name, bool value) const
    {
        glUniform1i(glGetUniformLocation(ID, name.c_str()), (int)value);
    }
    // ------------------------------------------------------------------------
    void setInt(const std::string &name, int value) const
    {
        glUniform1i(glGetUniformLocation(ID, name.c_str()), value);
    }
    // ------------------------------------------------------------------------
    void setFloat(const std::string &name, float value) const
    {
        glUniform1f(glGetUniformLocation(ID, name.c_str()), value);
    }

    void setVec2(const std::string &name, float x, float y) const {
        glUniform2f(glGetUniformLocation(ID, name.c_str()), x, y);
    }

private:
    // utility function for checking shader compilation/linking errors.
    // ------------------------------------------------------------------------
    void checkCompileErrors(unsigned int shader, std::string type);

    Channel iChannel0;
    Channel iChannel1;
    Channel iChannel2;

    std::string bufferA;
    std::string bufferB;
    std::string bufferC;
};

#endif //OPENGLTEST_SHADER_HPP