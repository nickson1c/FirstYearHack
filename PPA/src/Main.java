import java.util.Scanner; // scanner for writing strings


public class Person
{
    public String name;
    public Person(String name)
    {
        this.name = name;
    }
}

public class Test
{
    public void Test()
    {
        String s1 = "hello";
        String s2 = s1;

        s1 = s1.toUpperCase();
        s2 = s2.toUpperCase();
        System.out.println(s1);
        System.out.println(s2);
        System.out.println(s1+s2);
        Person p1 = new Person("Sam Smith");
        Person p2 = new Person("Sam Smith");

        if (p1==p2) // not the same object right!
        {
            System.out.println("Oh Em Gee Same");
        }
        else
        {
            System.out.println("Hello");
        }
    }
}

void main() {
    //TIP Press <shortcut actionId="ShowIntentionActions"/> with your caret at the highlighted text
    // to see how IntelliJ IDEA suggests fixing it.
    Test test1 = new Test();
    test1.Test();
    Scanner myObj = new Scanner(System.in);
    System.out.println("String");
    String hello = myObj.nextLine();
    System.out.println(hello == "hello"); // false because this is an object comparison
    System.out.println(hello.equals("hello")); // true as this is a string literal comparison
}
